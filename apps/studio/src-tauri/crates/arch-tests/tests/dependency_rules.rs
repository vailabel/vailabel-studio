//! Dependency-rule tests.
//!
//! These assert the Clean-Architecture dependency rule structurally:
//! - **Fully pure crates** (core, shared, plugin, and the not-yet-migrated
//!   module crates) must contain NO infrastructure imports anywhere and NO
//!   infrastructure dependencies in their `Cargo.toml`.
//! - **Layered module crates** (those that own a Diesel `infrastructure/` layer)
//!   must keep their `domain`/`application`/`contracts` layers pure, but their
//!   `infrastructure/` may use diesel + the shared db crate.
//!
//! Excluded entirely: `db` (the shared connection), `runtime`/`runtime-manager`
//! (the Python ACL), `arch-tests`, and the binary.

use std::fs;
use std::path::{Path, PathBuf};

/// Crates whose ENTIRE `src/` must be infrastructure-free.
const FULLY_PURE: &[&str] = &[
    "core", "shared", "plugin", "copilot", "search",
];

/// Module crates that own an `infrastructure/` layer (typed Diesel; for `cloud`
/// an OpenDAL object store; for `video` the FFmpeg CLI; for `analysis` the
/// `image`-crate pixel decoder; for `models` the `ort` ONNX runtime). Their
/// `domain`/`application`/`contracts` layers must stay pure; `infrastructure/`
/// legitimately depends on its backing technology (diesel + `vailabel-db`,
/// opendal, the FFmpeg CLI, `image`, or `ort`), so it is scanned at folder
/// granularity and its `Cargo.toml` is exempt from the dependency check.
const LAYERED: &[&str] = &[
    "project", "dataset", "annotation", "training", "cloud", "video", "analysis", "models",
    "workspace",
];

/// The layers of a LAYERED crate that must remain pure.
const PURE_LAYERS: &[&str] = &["domain", "application", "contracts"];

/// Forbidden usage tokens, matched against comment-stripped source. The `::`
/// suffix (and `std::` prefix) keep these from matching substrings of unrelated
/// identifiers such as `report`/`export` (for `ort`) or `std::fmt` (for `std::fs`).
const FORBIDDEN_USAGES: &[&str] = &[
    "diesel::",
    "tauri::",
    "rusqlite::",
    "reqwest::",
    "opendal::",
    "ort::",
    "std::process",
    "std::fs",
];

/// Forbidden dependency crate names in a fully-pure crate's `Cargo.toml`.
const FORBIDDEN_DEPS: &[&str] = &[
    "diesel",
    "tauri",
    "rusqlite",
    "reqwest",
    "opendal",
    "ort",
    "libsqlite3-sys",
    "vailabel-db",
];

/// `.../crates/arch-tests` → `.../crates`.
fn crates_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("arch-tests lives under crates/")
        .to_path_buf()
}

fn collect_rs_files(dir: &Path, out: &mut Vec<PathBuf>) {
    if !dir.exists() {
        return;
    }
    for entry in fs::read_dir(dir).expect("read_dir") {
        let path = entry.expect("dir entry").path();
        if path.is_dir() {
            collect_rs_files(&path, out);
        } else if path.extension().map(|e| e == "rs").unwrap_or(false) {
            out.push(path);
        }
    }
}

/// Drop everything from the first `//` on each line, so tokens mentioned in
/// doc/line comments (e.g. "carries no Tauri/diesel knowledge") are ignored and
/// only real code is inspected.
fn strip_line_comments(src: &str) -> String {
    src.lines()
        .map(|line| match line.find("//") {
            Some(idx) => &line[..idx],
            None => line,
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// The contents of the `[dependencies]` section, or empty if there is none.
fn dependencies_block(manifest: &str) -> String {
    let Some(start) = manifest.find("[dependencies]") else {
        return String::new();
    };
    let rest = &manifest[start + "[dependencies]".len()..];
    let end = rest.find("\n[").unwrap_or(rest.len());
    rest[..end].to_string()
}

/// True if `code` uses `token` as a real path segment — i.e. `token` appears at
/// least once NOT immediately preceded by an identifier character. This rejects
/// substring false-positives where the token is the tail of a larger identifier
/// (`ImageQualityReport::` / `export::` / `sort::` matching `ort::`) while still
/// catching `use ort::`, `crate::ort::`, `tauri::`, `std::fs`, etc. (the
/// trailing `::` / `std::` shape is already baked into each token).
fn uses_token(code: &str, token: &str) -> bool {
    let bytes = code.as_bytes();
    let mut start = 0;
    while let Some(pos) = code[start..].find(token) {
        let idx = start + pos;
        let preceded_by_ident =
            idx > 0 && (bytes[idx - 1] == b'_' || bytes[idx - 1].is_ascii_alphanumeric());
        if !preceded_by_ident {
            return true;
        }
        start = idx + 1;
    }
    false
}

/// Scan every `.rs` file under `dir` for forbidden usages, recording any in
/// `violations`. Returns the number of files scanned.
fn scan_dir(dir: &Path, violations: &mut Vec<String>) -> usize {
    let mut files = Vec::new();
    collect_rs_files(dir, &mut files);
    let count = files.len();
    for file in files {
        let code = strip_line_comments(&fs::read_to_string(&file).expect("read source"));
        for token in FORBIDDEN_USAGES {
            if uses_token(&code, token) {
                violations.push(format!("{} uses forbidden `{}`", file.display(), token));
            }
        }
    }
    count
}

#[test]
fn pure_layers_have_no_infrastructure_imports() {
    let crates = crates_dir();
    let mut violations = Vec::new();
    let mut scanned = 0usize;

    // Fully pure crates: the entire src/ tree must be clean.
    for krate in FULLY_PURE {
        scanned += scan_dir(&crates.join(krate).join("src"), &mut violations);
    }
    // Layered crates: only the pure layers (skip infrastructure/).
    for krate in LAYERED {
        let src = crates.join(krate).join("src");
        for layer in PURE_LAYERS {
            scanned += scan_dir(&src.join(layer), &mut violations);
        }
    }

    // Guard against a silently-broken walk finding nothing.
    assert!(
        scanned >= FULLY_PURE.len(),
        "scanner walked too few files ({scanned}) — the walk is broken"
    );
    assert!(
        violations.is_empty(),
        "Clean-Architecture dependency-rule violations (infrastructure in a pure layer):\n{}",
        violations.join("\n")
    );
}

#[test]
fn scanner_matches_real_usage_and_ignores_comments() {
    // A real import in code is caught.
    assert!(strip_line_comments("use tauri::AppHandle;").contains("tauri::"));
    // The same token inside a comment is ignored (so doc text is safe).
    assert!(!strip_line_comments("/// carries no tauri:: knowledge").contains("tauri::"));
    assert!(!strip_line_comments("// see diesel:: docs").contains("diesel::"));
    // `ort` as a substring of `report`/`export` must NOT match the `ort::` token.
    assert!(!strip_line_comments("let report = export_thing();").contains("ort::"));
    // `std::fmt` must NOT match the forbidden `std::fs` token.
    assert!(!strip_line_comments("use std::fmt::Debug;").contains("std::fs"));

    // `uses_token` rejects a token that is only the tail of a larger identifier
    // (`Report::`/`export::`/`sort::` → `ort::`) but still catches real paths.
    assert!(!uses_token("let x = ImageQualityReport::default();", "ort::"));
    assert!(!uses_token("values.sort_by(|a, b| a.cmp(b));", "ort::"));
    assert!(uses_token("use ort::Session;", "ort::"));
    assert!(uses_token("crate::ort::init();", "ort::"));
    assert!(uses_token("    tauri::command", "tauri::"));
}

#[test]
fn fully_pure_crates_have_no_infrastructure_dependencies() {
    let crates = crates_dir();
    let mut violations = Vec::new();

    for krate in FULLY_PURE {
        let manifest_path = crates.join(krate).join("Cargo.toml");
        let manifest = fs::read_to_string(&manifest_path).expect("read Cargo.toml");
        let deps = dependencies_block(&manifest);
        for line in deps.lines() {
            let trimmed = line.trim_start();
            for dep in FORBIDDEN_DEPS {
                if let Some(after) = trimmed.strip_prefix(dep) {
                    // A dependency declaration: `dep = ...` or `dep.workspace = ...`.
                    if after.starts_with(' ') || after.starts_with('.') || after.starts_with('=') {
                        violations.push(format!(
                            "{} depends on forbidden `{}`",
                            manifest_path.display(),
                            dep
                        ));
                    }
                }
            }
        }
    }

    assert!(
        violations.is_empty(),
        "Fully-pure crates must not depend on infrastructure crates:\n{}",
        violations.join("\n")
    );
}

#[test]
fn core_is_the_dependency_root() {
    let manifest = fs::read_to_string(crates_dir().join("core").join("Cargo.toml"))
        .expect("read core manifest");
    let deps = dependencies_block(&manifest);
    assert!(
        !deps.contains("vailabel"),
        "vailabel-core is the dependency root and must not depend on any internal crate:\n{}",
        deps
    );
}
