//! Dataset export for the training pipeline.
//!
//! Turns a project's images + annotations (read from the generic `EntityStore`)
//! into an on-disk **YOLO detection dataset** — `images/{train,val}`,
//! `labels/{train,val}/*.txt`, and a `data.yaml` — under the app-data dir. The
//! `data.yaml` path it returns is exactly what `training_start` hands to
//! ultralytics as `data=`. This is the missing link that lets a user train on
//! what they labeled (the runtime can't read the studio's SQLite DB itself).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{Manager, State};

use crate::store::DesktopStore;
use crate::{
    emit_domain_event_for_ids, normalize_entity, AppError, AppState,
};

// ---------------------------------------------------------------------------
// Payload / result
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetExportPayload {
    pub project_id: String,
    /// Fraction of images held out for validation (default 0.2). Clamped to
    /// [0.05, 0.5]; a project with a single image trains and validates on it.
    pub val_split: Option<f32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetExportResult {
    /// The `data.yaml` path — pass this straight to `training_start.datasetPath`.
    pub dataset_path: String,
    pub root: String,
    pub image_count: usize,
    pub train_count: usize,
    pub val_count: usize,
    /// Images that contributed at least one usable box.
    pub labeled_count: usize,
    pub annotation_count: usize,
    pub class_count: usize,
    pub class_names: Vec<String>,
    /// Non-fatal issues (skipped images / unmappable annotations) for the UI.
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
struct DataYaml {
    path: String,
    train: String,
    val: String,
    nc: usize,
    names: Vec<String>,
}

// ---------------------------------------------------------------------------
// Pure conversion helpers (unit-tested below)
// ---------------------------------------------------------------------------

fn field<'a>(v: &'a Value, camel: &str, snake: &str) -> Option<&'a Value> {
    v.get(camel).or_else(|| v.get(snake))
}

fn str_field<'a>(v: &'a Value, camel: &str, snake: &str) -> Option<&'a str> {
    field(v, camel, snake).and_then(Value::as_str)
}

/// Resolve an annotation to a class index: prefer the label id, fall back to a
/// case-insensitive match on the annotation's name against the label vocabulary.
fn class_index_of(
    ann: &Value,
    id_to_index: &HashMap<String, usize>,
    name_to_index: &HashMap<String, usize>,
) -> Option<usize> {
    if let Some(id) = str_field(ann, "labelId", "label_id") {
        if let Some(idx) = id_to_index.get(id) {
            return Some(*idx);
        }
    }
    for key in ["name", "label"] {
        if let Some(name) = ann.get(key).and_then(Value::as_str) {
            if let Some(idx) = name_to_index.get(&name.trim().to_lowercase()) {
                return Some(*idx);
            }
        }
    }
    None
}

/// Pixel-space bounding box `(x0, y0, x1, y1)` for any annotation shape. Boxes
/// use their two corners; polygons / lines / freehand use the bbox of all
/// points; a circle uses center±radius; points have no area.
fn bbox_pixels(ann_type: &str, coords: &[Value]) -> Option<(f64, f64, f64, f64)> {
    let pts: Vec<(f64, f64)> = coords
        .iter()
        .filter_map(|p| {
            Some((p.get("x")?.as_f64()?, p.get("y")?.as_f64()?))
        })
        .collect();
    if pts.is_empty() {
        return None;
    }

    let ty = ann_type.trim().to_lowercase();
    if ty == "point" {
        return None;
    }
    if ty == "circle" && pts.len() >= 2 {
        let (cx, cy) = pts[0];
        let r = ((pts[1].0 - cx).powi(2) + (pts[1].1 - cy).powi(2)).sqrt();
        return Some((cx - r, cy - r, cx + r, cy + r));
    }

    let x0 = pts.iter().map(|p| p.0).fold(f64::INFINITY, f64::min);
    let y0 = pts.iter().map(|p| p.1).fold(f64::INFINITY, f64::min);
    let x1 = pts.iter().map(|p| p.0).fold(f64::NEG_INFINITY, f64::max);
    let y1 = pts.iter().map(|p| p.1).fold(f64::NEG_INFINITY, f64::max);
    Some((x0, y0, x1, y1))
}

/// One normalized YOLO line `"<cls> <cx> <cy> <w> <h>"`, or `None` if the
/// annotation has no resolvable class / no usable area within the image.
fn annotation_to_yolo_line(
    ann: &Value,
    class_idx: usize,
    width: f64,
    height: f64,
) -> Option<String> {
    if width <= 0.0 || height <= 0.0 {
        return None;
    }
    let ann_type = str_field(ann, "type", "annotation_type").unwrap_or("box");
    let coords = field(ann, "coordinates", "coordinates")?.as_array()?;
    let (x0, y0, x1, y1) = bbox_pixels(ann_type, coords)?;

    let cx = ((x0 + x1) / 2.0 / width).clamp(0.0, 1.0);
    let cy = ((y0 + y1) / 2.0 / height).clamp(0.0, 1.0);
    let bw = ((x1 - x0).abs() / width).clamp(0.0, 1.0);
    let bh = ((y1 - y0).abs() / height).clamp(0.0, 1.0);
    if bw <= 0.0 || bh <= 0.0 {
        return None;
    }
    Some(format!("{class_idx} {cx:.6} {cy:.6} {bw:.6} {bh:.6}"))
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

fn lock_store(
    store: &Arc<Mutex<DesktopStore>>,
) -> Result<std::sync::MutexGuard<'_, DesktopStore>, AppError> {
    store
        .lock()
        .map_err(|_| AppError::Message("Desktop store is unavailable".into()))
}

#[tauri::command]
pub async fn dataset_export_yolo(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: DatasetExportPayload,
) -> Result<DatasetExportResult, AppError> {
    let project_id = payload.project_id;
    let val_split = payload.val_split.unwrap_or(0.2).clamp(0.05, 0.5);

    // 1. Labels → ordered class vocabulary + lookup maps.
    let (class_names, id_to_index, name_to_index) = {
        let guard = lock_store(&state.store)?;
        let labels = guard.list_by_field("labels", "project_id", &project_id)?;
        let mut names = Vec::new();
        let mut by_id = HashMap::new();
        let mut by_name = HashMap::new();
        for label in &labels {
            let name = match label.get("name").and_then(Value::as_str) {
                Some(n) if !n.trim().is_empty() => n.trim().to_string(),
                _ => continue,
            };
            let idx = names.len();
            if let Some(id) = label.get("id").and_then(Value::as_str) {
                by_id.insert(id.to_string(), idx);
            }
            by_name.insert(name.to_lowercase(), idx);
            names.push(name);
        }
        (names, by_id, by_name)
    };

    if class_names.is_empty() {
        return Err(AppError::Message(
            "This project has no labels — add at least one label before training.".into(),
        ));
    }

    // 2. Output layout under app-data: runtime/datasets/<project>/<uuid>/.
    let root = app
        .path()
        .app_data_dir()?
        .join("runtime")
        .join("datasets")
        .join(&project_id)
        .join(uuid::Uuid::new_v4().to_string());
    let dirs = ["images/train", "images/val", "labels/train", "labels/val"];
    for d in dirs {
        std::fs::create_dir_all(root.join(d))?;
    }

    // 3. Walk images, convert annotations, write each into its train/val split.
    // Deterministic split: every Nth image goes to val (N = round(1/val_split)).
    let step = (1.0 / val_split).round().max(2.0) as usize;

    let images = {
        let guard = lock_store(&state.store)?;
        guard.list_by_field("images", "project_id", &project_id)?
    };

    let mut warnings: Vec<String> = Vec::new();
    let mut train_count = 0usize;
    let mut val_count = 0usize;
    let mut labeled_count = 0usize;
    let mut annotation_count = 0usize;
    let mut split_index = 0usize; // counts only images actually written

    for image in &images {
        let img_id = match image.get("id").and_then(Value::as_str) {
            Some(id) => id,
            None => continue,
        };
        let src = match str_field(image, "path", "path") {
            Some(p) if !p.is_empty() => PathBuf::from(p),
            _ => {
                warnings.push(format!("image {img_id}: no file path — skipped"));
                continue;
            }
        };
        if !src.exists() {
            warnings.push(format!("image {img_id}: file missing on disk — skipped"));
            continue;
        }
        let width = field(image, "width", "width").and_then(Value::as_f64).unwrap_or(0.0);
        let height = field(image, "height", "height").and_then(Value::as_f64).unwrap_or(0.0);
        if width <= 0.0 || height <= 0.0 {
            warnings.push(format!("image {img_id}: unknown dimensions — skipped"));
            continue;
        }

        // Build label lines from this image's annotations.
        let anns = {
            let guard = lock_store(&state.store)?;
            guard.list_by_field("annotations", "image_id", img_id)?
        };
        let mut lines = Vec::new();
        for ann in &anns {
            let Some(cls) = class_index_of(ann, &id_to_index, &name_to_index) else {
                continue;
            };
            if let Some(line) = annotation_to_yolo_line(ann, cls, width, height) {
                lines.push(line);
                annotation_count += 1;
            }
        }
        if !lines.is_empty() {
            labeled_count += 1;
        }

        let split = if split_index % step == 0 { "val" } else { "train" };
        split_index += 1;
        if split == "val" {
            val_count += 1;
        } else {
            train_count += 1;
        }

        // Name image + label by the image id so the YOLO stem-pairing is unique.
        let ext = src
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg")
            .to_string();
        let img_dst = root.join("images").join(split).join(format!("{img_id}.{ext}"));
        let lbl_dst = root.join("labels").join(split).join(format!("{img_id}.txt"));
        std::fs::copy(&src, &img_dst)?;
        std::fs::write(&lbl_dst, lines.join("\n"))?;
    }

    if split_index == 0 {
        return Err(AppError::Message(
            "No usable images found for this project (missing files or dimensions).".into(),
        ));
    }

    // Guarantee both splits are non-empty — ultralytics needs a val set.
    if val_count == 0 || train_count == 0 {
        mirror_single_split(&root, val_count == 0)?;
        if val_count == 0 {
            val_count = train_count;
        } else {
            train_count = val_count;
        }
    }

    // 4. data.yaml — the file ultralytics consumes as `data=`.
    let data_yaml = DataYaml {
        path: root.to_string_lossy().to_string(),
        train: "images/train".into(),
        val: "images/val".into(),
        nc: class_names.len(),
        names: class_names.clone(),
    };
    let yaml_path = root.join("data.yaml");
    std::fs::write(&yaml_path, serde_yaml::to_string(&data_yaml)?)?;

    Ok(DatasetExportResult {
        dataset_path: yaml_path.to_string_lossy().to_string(),
        root: root.to_string_lossy().to_string(),
        image_count: split_index,
        train_count,
        val_count,
        labeled_count,
        annotation_count,
        class_count: class_names.len(),
        class_names,
        warnings,
    })
}

/// When one split is empty (tiny projects), copy the populated split's files
/// into the empty one so both `images/` + `labels/` dirs are paired and non-empty.
fn mirror_single_split(root: &Path, val_is_empty: bool) -> Result<(), AppError> {
    let (from, to) = if val_is_empty { ("train", "val") } else { ("val", "train") };
    for kind in ["images", "labels"] {
        let from_dir = root.join(kind).join(from);
        let to_dir = root.join(kind).join(to);
        for entry in std::fs::read_dir(&from_dir)? {
            let entry = entry?;
            if entry.path().is_file() {
                std::fs::copy(entry.path(), to_dir.join(entry.file_name()))?;
            }
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Import: YOLO / Roboflow export folder → project labels + images + annotations
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetImportPayload {
    pub project_id: String,
    /// Root of an unzipped YOLO/Roboflow export (holds `data.yaml` and the
    /// image/label files, in any of the common layouts).
    pub folder: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetImportResult {
    pub image_count: usize,
    pub annotation_count: usize,
    /// Total classes the dataset declares (from data.yaml, or seen in labels).
    pub class_count: usize,
    /// Classes that didn't already exist on the project and were created.
    pub created_class_count: usize,
    pub class_names: Vec<String>,
    pub skipped_image_count: usize,
    pub warnings: Vec<String>,
}

const IMAGE_EXTS: [&str; 8] = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"];

/// Distinct, readable colors handed out to newly created classes in order.
const IMPORT_COLORS: [&str; 10] = [
    "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d",
    "#ea580c", "#4f46e5",
];

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMAGE_EXTS.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Recursively collect image files under `root` (labels dirs hold `.txt`, so
/// they're naturally excluded). Best-effort: unreadable dirs are skipped.
fn collect_images(root: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_images(&path, out);
        } else if is_image_file(&path) {
            out.push(path);
        }
    }
}

/// Find the YOLO label file for an image: a sibling `.txt`, or the same stem
/// under a parallel `labels/` dir (Roboflow's `…/images/x.jpg`↔`…/labels/x.txt`).
fn label_path_for(image: &Path) -> Option<PathBuf> {
    let sibling = image.with_extension("txt");
    if sibling.is_file() {
        return Some(sibling);
    }
    let stem = image.file_stem()?;
    let parent = image.parent()?;
    let is_images_dir = parent
        .file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.eq_ignore_ascii_case("images"))
        .unwrap_or(false);
    if is_images_dir {
        let mut cand = parent.parent()?.join("labels").join(stem);
        cand.set_extension("txt");
        if cand.is_file() {
            return Some(cand);
        }
    }
    None
}

fn yaml_scalar_to_string(v: &serde_yaml::Value) -> String {
    match v {
        serde_yaml::Value::String(s) => s.clone(),
        serde_yaml::Value::Number(n) => n.to_string(),
        serde_yaml::Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

/// Extract the ordered class names from a parsed `data.yaml` `names:` field.
/// Handles both the list form `['car','person']` and the mapping form
/// `{0: car, 1: person}` (ordered by key).
fn yaml_names_field(value: &serde_yaml::Value) -> Option<Vec<String>> {
    match value.get("names")? {
        serde_yaml::Value::Sequence(seq) => {
            Some(seq.iter().map(yaml_scalar_to_string).collect())
        }
        serde_yaml::Value::Mapping(map) => {
            let mut pairs: Vec<(i64, String)> = map
                .iter()
                .filter_map(|(k, v)| {
                    let idx = k
                        .as_i64()
                        .or_else(|| k.as_str().and_then(|s| s.parse().ok()))?;
                    Some((idx, yaml_scalar_to_string(v)))
                })
                .collect();
            pairs.sort_by_key(|(i, _)| *i);
            Some(pairs.into_iter().map(|(_, n)| n).collect())
        }
        _ => None,
    }
}

/// The dataset's class vocabulary: prefer a `*.yaml` with a `names:` field,
/// then a `classes.txt`/`labels.txt` (one per line). Empty if neither exists —
/// classes are then synthesized (`class_0`, …) from the label-file indices.
fn parse_class_names(root: &Path) -> Vec<String> {
    let mut candidates: Vec<PathBuf> = ["data.yaml", "data.yml", "dataset.yaml", "dataset.yml"]
        .iter()
        .map(|n| root.join(n))
        .collect();
    if let Ok(entries) = std::fs::read_dir(root) {
        for e in entries.flatten() {
            let p = e.path();
            let is_yaml = p
                .extension()
                .and_then(|x| x.to_str())
                .map(|x| matches!(x.to_lowercase().as_str(), "yaml" | "yml"))
                .unwrap_or(false);
            if is_yaml {
                candidates.push(p);
            }
        }
    }
    for cand in candidates {
        if let Ok(text) = std::fs::read_to_string(&cand) {
            if let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(&text) {
                if let Some(names) = yaml_names_field(&value) {
                    if !names.is_empty() {
                        return names;
                    }
                }
            }
        }
    }
    for name in ["classes.txt", "labels.txt"] {
        if let Ok(text) = std::fs::read_to_string(root.join(name)) {
            let v: Vec<String> = text
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            if !v.is_empty() {
                return v;
            }
        }
    }
    Vec::new()
}

/// Parse one YOLO label line into `(class_index, annotation_type, pixel_points)`.
/// `<cls> cx cy w h` → a 2-corner box; `<cls> x1 y1 x2 y2 …` (segmentation) →
/// a polygon. Coordinates are normalized [0,1]; we scale them to pixels here.
fn parse_yolo_line(
    line: &str,
    width: f64,
    height: f64,
) -> Option<(usize, &'static str, Vec<(f64, f64)>)> {
    let toks: Vec<f64> = line
        .split_whitespace()
        .map(|t| t.parse::<f64>())
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    if toks.len() < 5 || width <= 0.0 || height <= 0.0 {
        return None;
    }
    let class_idx = toks[0].max(0.0) as usize;
    let rest = &toks[1..];

    if rest.len() == 4 {
        let (cx, cy, w, h) = (rest[0], rest[1], rest[2], rest[3]);
        let x0 = ((cx - w / 2.0) * width).clamp(0.0, width);
        let y0 = ((cy - h / 2.0) * height).clamp(0.0, height);
        let x1 = ((cx + w / 2.0) * width).clamp(0.0, width);
        let y1 = ((cy + h / 2.0) * height).clamp(0.0, height);
        if x1 <= x0 || y1 <= y0 {
            return None;
        }
        return Some((class_idx, "box", vec![(x0, y0), (x1, y1)]));
    }

    if rest.len() >= 6 && rest.len() % 2 == 0 {
        let pts: Vec<(f64, f64)> = rest
            .chunks(2)
            .map(|c| {
                (
                    (c[0] * width).clamp(0.0, width),
                    (c[1] * height).clamp(0.0, height),
                )
            })
            .collect();
        return Some((class_idx, "polygon", pts));
    }

    None
}

/// Resolve a class index to `(label_id, name, color)`, reusing an existing
/// project label by (case-insensitive) name or minting a new one. New labels
/// are buffered in `new_labels` and written in the final transaction.
fn resolve_class(
    idx: usize,
    class_names: &[String],
    project_id: &str,
    name_to_label: &mut HashMap<String, (String, String)>,
    index_to_label: &mut HashMap<usize, (String, String, String)>,
    new_labels: &mut Vec<Value>,
) -> (String, String, String) {
    if let Some(hit) = index_to_label.get(&idx) {
        return hit.clone();
    }
    let name = class_names
        .get(idx)
        .cloned()
        .filter(|n| !n.trim().is_empty())
        .unwrap_or_else(|| format!("class_{idx}"));
    let key = name.trim().to_lowercase();

    let (id, color) = if let Some((id, color)) = name_to_label.get(&key) {
        (id.clone(), color.clone())
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        let color = IMPORT_COLORS[new_labels.len() % IMPORT_COLORS.len()].to_string();
        new_labels.push(json!({
            "id": id,
            "name": name,
            "color": color,
            "projectId": project_id,
            "project_id": project_id,
        }));
        name_to_label.insert(key, (id.clone(), color.clone()));
        (id, color)
    };

    index_to_label.insert(idx, (id.clone(), name.clone(), color.clone()));
    (id, name, color)
}

/// Import a YOLO/Roboflow dataset folder into a project: creates any missing
/// classes, references the image files in place (no copy), and converts each
/// `.txt` annotation back to an image-space box/polygon. The mirror of
/// `dataset_export_yolo` — so a user can keep labeling and training on data
/// brought in from elsewhere.
#[tauri::command]
pub async fn dataset_import_yolo(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    payload: DatasetImportPayload,
) -> Result<DatasetImportResult, AppError> {
    let project_id = payload.project_id;
    let root = PathBuf::from(&payload.folder);
    if !root.is_dir() {
        return Err(AppError::Message(format!(
            "Folder not found: {}",
            root.display()
        )));
    }

    // 1. Class vocabulary declared by the export (may be empty).
    let class_names = parse_class_names(&root);

    // 2. Existing project labels → case-insensitive name → (id, color).
    let mut name_to_label: HashMap<String, (String, String)> = HashMap::new();
    {
        let guard = lock_store(&state.store)?;
        for label in guard.list_by_field("labels", "project_id", &project_id)? {
            let name = label.get("name").and_then(Value::as_str);
            let id = label.get("id").and_then(Value::as_str);
            if let (Some(name), Some(id)) = (name, id) {
                let color = label
                    .get("color")
                    .and_then(Value::as_str)
                    .unwrap_or("#2563eb")
                    .to_string();
                name_to_label.insert(name.trim().to_lowercase(), (id.to_string(), color));
            }
        }
    }

    let mut new_labels: Vec<Value> = Vec::new();
    let mut index_to_label: HashMap<usize, (String, String, String)> = HashMap::new();

    // Pre-seed every declared class so colors/labels follow data.yaml order and
    // the project gets the full taxonomy for continued labeling.
    for idx in 0..class_names.len() {
        resolve_class(
            idx,
            &class_names,
            &project_id,
            &mut name_to_label,
            &mut index_to_label,
            &mut new_labels,
        );
    }

    // 3. Walk image files; build image + annotation rows (file IO, no DB lock).
    let mut image_files = Vec::new();
    collect_images(&root, &mut image_files);
    image_files.sort();
    if image_files.is_empty() {
        return Err(AppError::Message(
            "No image files found in that folder.".into(),
        ));
    }

    let mut images_buf: Vec<Value> = Vec::new();
    let mut anns_buf: Vec<Value> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    let mut skipped = 0usize;

    for img_path in &image_files {
        let (w, h) = match image::image_dimensions(img_path) {
            Ok(dims) => dims,
            Err(_) => {
                skipped += 1;
                if warnings.len() < 25 {
                    warnings.push(format!("{}: unreadable image — skipped", img_path.display()));
                }
                continue;
            }
        };
        let width = w as f64;
        let height = h as f64;
        let img_id = uuid::Uuid::new_v4().to_string();
        let name = img_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("image")
            .to_string();
        let rel = img_path
            .strip_prefix(&root)
            .ok()
            .and_then(|p| p.to_str())
            .map(str::to_string)
            .unwrap_or_else(|| name.clone());

        images_buf.push(json!({
            "id": img_id,
            "name": name,
            "path": img_path.to_string_lossy(),
            "imagePath": rel,
            "image_path": rel,
            "width": w,
            "height": h,
            "projectId": project_id,
            "project_id": project_id,
        }));

        let Some(lbl_path) = label_path_for(img_path) else {
            continue;
        };
        let Ok(text) = std::fs::read_to_string(&lbl_path) else {
            continue;
        };
        for raw in text.lines() {
            let line = raw.trim();
            if line.is_empty() {
                continue;
            }
            let Some((idx, ann_type, pts)) = parse_yolo_line(line, width, height) else {
                if warnings.len() < 25 {
                    warnings.push(format!("{}: unparseable line skipped", lbl_path.display()));
                }
                continue;
            };
            let (label_id, label_name, color) = resolve_class(
                idx,
                &class_names,
                &project_id,
                &mut name_to_label,
                &mut index_to_label,
                &mut new_labels,
            );
            let coords: Vec<Value> = pts.iter().map(|(x, y)| json!({ "x": x, "y": y })).collect();
            anns_buf.push(json!({
                "id": uuid::Uuid::new_v4().to_string(),
                "type": ann_type,
                "coordinates": coords,
                "labelId": label_id,
                "label_id": label_id,
                "name": label_name,
                "color": color,
                "imageId": img_id,
                "image_id": img_id,
                "projectId": project_id,
                "project_id": project_id,
            }));
        }
    }

    let image_count = images_buf.len();
    let annotation_count = anns_buf.len();
    let created_class_count = new_labels.len();
    let class_count = if class_names.is_empty() {
        index_to_label.len()
    } else {
        class_names.len()
    };

    // 4. Single write pass: labels first (annotations reference them), then
    //    images, then annotations.
    {
        let guard = lock_store(&state.store)?;
        for label in new_labels {
            guard.upsert_entity("labels", normalize_entity("labels", label)?)?;
        }
        for image in images_buf {
            guard.upsert_entity("images", normalize_entity("images", image)?)?;
        }
        for ann in anns_buf {
            guard.upsert_entity("annotations", normalize_entity("annotations", ann)?)?;
        }
    }

    // Let the webview render the referenced images without copying them.
    let _ = app
        .asset_protocol_scope()
        .allow_directory(&root, true);

    // One refresh nudge per entity kind (frontend also reloads after the await).
    for entity in ["labels", "images", "annotations"] {
        let _ = emit_domain_event_for_ids(
            &app,
            entity,
            "created",
            project_id.clone(),
            Some(project_id.clone()),
            None,
        );
    }

    Ok(DatasetImportResult {
        image_count,
        annotation_count,
        class_count,
        created_class_count,
        class_names,
        skipped_image_count: skipped,
        warnings,
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn box_two_corners_normalizes_to_center_and_size() {
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": 100.0, "y": 50.0 }, { "x": 300.0, "y": 250.0 }],
        });
        // image 400x400 → cx=200/400=0.5, cy=150/400=0.375, w=200/400=0.5, h=200/400=0.5
        let line = annotation_to_yolo_line(&ann, 3, 400.0, 400.0).unwrap();
        assert_eq!(line, "3 0.500000 0.375000 0.500000 0.500000");
    }

    #[test]
    fn box_corners_in_any_order_give_positive_size() {
        // bottom-right listed first, top-left second.
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": 300.0, "y": 250.0 }, { "x": 100.0, "y": 50.0 }],
        });
        let line = annotation_to_yolo_line(&ann, 0, 400.0, 400.0).unwrap();
        assert_eq!(line, "0 0.500000 0.375000 0.500000 0.500000");
    }

    #[test]
    fn polygon_uses_bounding_box_of_all_points() {
        let ann = json!({
            "type": "polygon",
            "coordinates": [
                { "x": 10.0, "y": 20.0 },
                { "x": 60.0, "y": 20.0 },
                { "x": 35.0, "y": 70.0 }
            ],
        });
        // bbox = (10,20)-(60,70); on 100x100 → cx=0.35, cy=0.45, w=0.5, h=0.5
        let line = annotation_to_yolo_line(&ann, 1, 100.0, 100.0).unwrap();
        assert_eq!(line, "1 0.350000 0.450000 0.500000 0.500000");
    }

    #[test]
    fn point_has_no_area_and_is_skipped() {
        let ann = json!({ "type": "point", "coordinates": [{ "x": 10.0, "y": 10.0 }] });
        assert!(annotation_to_yolo_line(&ann, 0, 100.0, 100.0).is_none());
    }

    #[test]
    fn out_of_bounds_box_is_clamped() {
        let ann = json!({
            "type": "box",
            "coordinates": [{ "x": -50.0, "y": -50.0 }, { "x": 150.0, "y": 150.0 }],
        });
        // clamps center/size into [0,1]; never panics, always emits a line.
        let line = annotation_to_yolo_line(&ann, 0, 100.0, 100.0).unwrap();
        assert!(line.starts_with("0 "));
    }

    #[test]
    fn class_resolves_by_label_id_then_by_name() {
        let mut by_id = HashMap::new();
        by_id.insert("lbl-1".to_string(), 2usize);
        let mut by_name = HashMap::new();
        by_name.insert("car".to_string(), 5usize);

        let by_id_ann = json!({ "labelId": "lbl-1", "name": "ignored" });
        assert_eq!(class_index_of(&by_id_ann, &by_id, &by_name), Some(2));

        let by_name_ann = json!({ "name": "Car" });
        assert_eq!(class_index_of(&by_name_ann, &by_id, &by_name), Some(5));

        let unknown = json!({ "name": "tree" });
        assert_eq!(class_index_of(&unknown, &by_id, &by_name), None);
    }

    #[test]
    fn yolo_box_line_maps_back_to_pixel_corners() {
        // Inverse of `box_two_corners_normalizes_to_center_and_size`:
        // cls 3, cx=.5 cy=.375 w=.5 h=.5 on 400x400 → corners (100,50)-(300,250).
        let (idx, ty, pts) = parse_yolo_line("3 0.5 0.375 0.5 0.5", 400.0, 400.0).unwrap();
        assert_eq!(idx, 3);
        assert_eq!(ty, "box");
        assert_eq!(pts.len(), 2);
        assert!((pts[0].0 - 100.0).abs() < 1e-6);
        assert!((pts[0].1 - 50.0).abs() < 1e-6);
        assert!((pts[1].0 - 300.0).abs() < 1e-6);
        assert!((pts[1].1 - 250.0).abs() < 1e-6);
    }

    #[test]
    fn yolo_segmentation_line_maps_to_polygon() {
        let (idx, ty, pts) =
            parse_yolo_line("1 0.1 0.2 0.6 0.2 0.35 0.7", 100.0, 100.0).unwrap();
        assert_eq!(idx, 1);
        assert_eq!(ty, "polygon");
        assert_eq!(pts.len(), 3);
        assert!((pts[0].0 - 10.0).abs() < 1e-6);
        assert!((pts[2].1 - 70.0).abs() < 1e-6);
    }

    #[test]
    fn yolo_line_with_too_few_tokens_is_rejected() {
        assert!(parse_yolo_line("0 0.5 0.5", 100.0, 100.0).is_none());
    }

    #[test]
    fn yaml_names_parses_list_and_mapping_forms() {
        let list: serde_yaml::Value =
            serde_yaml::from_str("names: ['car', 'person']").unwrap();
        assert_eq!(
            yaml_names_field(&list),
            Some(vec!["car".to_string(), "person".to_string()])
        );

        let map: serde_yaml::Value =
            serde_yaml::from_str("names:\n  0: car\n  1: person").unwrap();
        assert_eq!(
            yaml_names_field(&map),
            Some(vec!["car".to_string(), "person".to_string()])
        );
    }
}
