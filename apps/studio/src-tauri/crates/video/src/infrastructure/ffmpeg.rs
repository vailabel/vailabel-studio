//! FFmpeg integration — the codec layer of the video pipeline.
//!
//! We shell out to the `ffmpeg` / `ffprobe` binaries rather than linking
//! libav: on Windows that keeps `cargo build` free of a C toolchain + pkg-config
//! dance, and the CLI exposes everything we need — CUDA hardware decode
//! (`-hwaccel cuda`) and the native scene-detection filter
//! (`select='gt(scene,T)'`).
//!
//! Binaries are resolved from `$VAILABEL_FFMPEG` / `$VAILABEL_FFPROBE` if set,
//! otherwise from `PATH`. Every CUDA invocation falls back to software decode
//! automatically if the GPU path errors, so a missing CUDA runtime degrades
//! gracefully instead of failing the job.

use std::path::Path;
use std::process::{Child, Command, Stdio};

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};

use crate::application::ports::VideoPipeline;
use crate::domain::{FfmpegInfo, FrameThumb, ProbeResult, SceneCut};

/// The FFmpeg-CLI implementation of the codec port.
#[derive(Debug, Default, Clone, Copy)]
pub struct FfmpegPipeline;

impl FfmpegPipeline {
    pub fn new() -> Self {
        Self
    }
}

impl VideoPipeline for FfmpegPipeline {
    fn info(&self) -> FfmpegInfo {
        info()
    }

    fn is_available(&self) -> bool {
        is_available()
    }

    fn has_cuda(&self) -> bool {
        has_cuda()
    }

    fn probe(&self, path: &str) -> Option<ProbeResult> {
        probe(path).ok()
    }

    fn extract_frames(
        &self,
        path: &str,
        out_dir: &Path,
        sample_fps: f64,
        max_edge: i64,
        duration: f64,
        src_fps: f64,
        use_cuda: bool,
        on_progress: &mut dyn FnMut(f64),
    ) -> DomainResult<Vec<FrameThumb>> {
        extract_frames(
            path,
            out_dir,
            sample_fps,
            max_edge,
            duration,
            src_fps,
            use_cuda,
            on_progress,
        )
    }

    fn detect_scenes(
        &self,
        path: &str,
        fps: f64,
        threshold: f64,
        use_cuda: bool,
    ) -> DomainResult<Vec<SceneCut>> {
        detect_scenes(path, fps, threshold, use_cuda)
    }

    fn clear_frame_cache(&self, frames_dir: &Path) {
        if frames_dir.exists() {
            let _ = std::fs::remove_dir_all(frames_dir);
        }
    }
}

/// Map any FFmpeg/IO failure into the domain's repository variant.
fn repo(error: impl ToString) -> DomainError {
    DomainError::repository(error.to_string())
}

fn ffmpeg_bin() -> String {
    std::env::var("VAILABEL_FFMPEG").unwrap_or_else(|_| "ffmpeg".to_string())
}

fn ffprobe_bin() -> String {
    std::env::var("VAILABEL_FFPROBE").unwrap_or_else(|_| "ffprobe".to_string())
}

/// Build a `Command` that never flashes a console window on Windows.
fn command(bin: &str) -> Command {
    let mut cmd = Command::new(bin);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Run a command to completion, returning combined stdout (on success).
fn run_capture(bin: &str, args: &[&str]) -> DomainResult<String> {
    let output = command(bin)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|err| DomainError::repository(format!("Failed to launch {bin}: {err}")))?;
    if !output.status.success() {
        return Err(DomainError::repository(format!(
            "{bin} exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Probe FFmpeg / FFprobe availability and CUDA support for the UI.
fn info() -> FfmpegInfo {
    let version = run_capture(&ffmpeg_bin(), &["-hide_banner", "-version"])
        .ok()
        .and_then(|out| out.lines().next().map(str::to_string));
    let ffmpeg = version.is_some();
    let ffprobe = run_capture(&ffprobe_bin(), &["-version"]).is_ok();
    let cuda = run_capture(&ffmpeg_bin(), &["-hide_banner", "-hwaccels"])
        .map(|out| out.to_lowercase().contains("cuda"))
        .unwrap_or(false);

    let message = if !ffmpeg {
        "FFmpeg was not found on PATH. Install FFmpeg (with CUDA for GPU decode) \
         or set VAILABEL_FFMPEG to enable frame extraction and scene detection."
            .to_string()
    } else if cuda {
        "FFmpeg ready with CUDA hardware decode.".to_string()
    } else {
        "FFmpeg ready (software decode; CUDA not detected).".to_string()
    };

    FfmpegInfo {
        ffmpeg,
        ffprobe,
        cuda,
        version,
        message,
    }
}

fn is_available() -> bool {
    run_capture(&ffmpeg_bin(), &["-hide_banner", "-version"]).is_ok()
}

fn has_cuda() -> bool {
    run_capture(&ffmpeg_bin(), &["-hide_banner", "-hwaccels"])
        .map(|out| out.to_lowercase().contains("cuda"))
        .unwrap_or(false)
}

/// Read duration / fps / dimensions / frame count via ffprobe (JSON output).
fn probe(path: &str) -> DomainResult<ProbeResult> {
    let json = run_capture(
        &ffprobe_bin(),
        &[
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ],
    )?;
    let value: Value = serde_json::from_str(&json).map_err(repo)?;

    let stream = value
        .get("streams")
        .and_then(Value::as_array)
        .and_then(|streams| {
            streams
                .iter()
                .find(|s| s.get("codec_type").and_then(Value::as_str) == Some("video"))
        })
        .ok_or_else(|| DomainError::repository("No video stream found"))?;

    let width = stream.get("width").and_then(Value::as_i64).unwrap_or(0);
    let height = stream.get("height").and_then(Value::as_i64).unwrap_or(0);

    let fps = stream
        .get("avg_frame_rate")
        .and_then(Value::as_str)
        .filter(|r| *r != "0/0")
        .or_else(|| stream.get("r_frame_rate").and_then(Value::as_str))
        .map(parse_rational)
        .filter(|f| *f > 0.0)
        .unwrap_or(30.0);

    let duration = stream
        .get("duration")
        .and_then(Value::as_str)
        .or_else(|| {
            value
                .get("format")
                .and_then(|f| f.get("duration"))
                .and_then(Value::as_str)
        })
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let frame_count = stream
        .get("nb_frames")
        .and_then(Value::as_str)
        .and_then(|n| n.parse::<i64>().ok())
        .filter(|n| *n > 0)
        .unwrap_or_else(|| (duration * fps).round() as i64);

    Ok(ProbeResult {
        duration,
        fps,
        width,
        height,
        frame_count,
    })
}

/// Parse an FFmpeg rational like "30000/1001" into frames-per-second.
fn parse_rational(value: &str) -> f64 {
    match value.split_once('/') {
        Some((num, den)) => {
            let n: f64 = num.parse().unwrap_or(0.0);
            let d: f64 = den.parse().unwrap_or(1.0);
            if d != 0.0 {
                n / d
            } else {
                0.0
            }
        }
        None => value.parse().unwrap_or(0.0),
    }
}

/// Detect scene cuts with FFmpeg's `select='gt(scene,T)'` filter, parsing the
/// `showinfo` timestamps from stderr. The first frame always opens scene 0.
fn detect_scenes(
    path: &str,
    fps: f64,
    threshold: f64,
    use_cuda: bool,
) -> DomainResult<Vec<SceneCut>> {
    let filter = format!(
        "scale=320:-2,select='gt(scene,{:.3})',showinfo",
        threshold.clamp(0.0, 1.0)
    );
    let mut args: Vec<String> = Vec::new();
    if use_cuda {
        args.push("-hwaccel".into());
        args.push("cuda".into());
    }
    args.extend([
        "-hide_banner".into(),
        "-i".into(),
        path.into(),
        "-an".into(),
        "-vf".into(),
        filter,
        "-f".into(),
        "null".into(),
        "-".into(),
    ]);

    let output = command(&ffmpeg_bin())
        .args(&args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .map_err(|err| DomainError::repository(format!("Failed to launch ffmpeg: {err}")))?;

    if !output.status.success() {
        if use_cuda {
            return detect_scenes(path, fps, threshold, false);
        }
        return Err(DomainError::repository(format!(
            "ffmpeg scene detection failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let mut cuts = vec![SceneCut {
        frame: 0,
        time: 0.0,
        score: 1.0,
    }];
    for line in stderr.lines() {
        if let Some(time) = line.find("pts_time:").map(|idx| &line[idx + 9..]) {
            let parsed: String = time
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            if let Ok(t) = parsed.parse::<f64>() {
                let frame = (t * fps).round() as i64;
                if frame > 0 {
                    cuts.push(SceneCut {
                        frame,
                        time: t,
                        score: 0.0,
                    });
                }
            }
        }
    }

    cuts.sort_by_key(|c| c.frame);
    cuts.dedup_by_key(|c| c.frame);
    Ok(cuts)
}

/// Extract a downscaled filmstrip at `sample_fps` to `out_dir`. Reports
/// determinate progress (0..1) by polling the output directory while FFmpeg
/// runs. CUDA decode falls back to software on error.
#[allow(clippy::too_many_arguments)]
fn extract_frames(
    path: &str,
    out_dir: &Path,
    sample_fps: f64,
    max_edge: i64,
    duration: f64,
    src_fps: f64,
    use_cuda: bool,
    on_progress: &mut dyn FnMut(f64),
) -> DomainResult<Vec<FrameThumb>> {
    std::fs::create_dir_all(out_dir).map_err(repo)?;
    clear_jpgs(out_dir)?;

    let pattern = out_dir.join("frame_%06d.jpg");
    let filter = format!(
        "fps={:.4},scale='min({},iw)':-2",
        sample_fps.max(0.1),
        max_edge.max(16)
    );
    let mut args: Vec<String> = Vec::new();
    if use_cuda {
        args.push("-hwaccel".into());
        args.push("cuda".into());
    }
    args.extend([
        "-hide_banner".into(),
        "-y".into(),
        "-i".into(),
        path.into(),
        "-an".into(),
        "-vf".into(),
        filter,
        "-q:v".into(),
        "4".into(),
        pattern.to_string_lossy().to_string(),
    ]);

    let mut child: Child = command(&ffmpeg_bin())
        .args(&args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| DomainError::repository(format!("Failed to launch ffmpeg: {err}")))?;

    let expected = ((duration * sample_fps).ceil() as usize).max(1);
    loop {
        match child.try_wait().map_err(repo)? {
            Some(status) => {
                if !status.success() {
                    if use_cuda {
                        return extract_frames(
                            path,
                            out_dir,
                            sample_fps,
                            max_edge,
                            duration,
                            src_fps,
                            false,
                            on_progress,
                        );
                    }
                    return Err(DomainError::repository("ffmpeg frame extraction failed"));
                }
                break;
            }
            None => {
                let produced = count_jpgs(out_dir);
                on_progress((produced as f64 / expected as f64).min(0.99));
                std::thread::sleep(std::time::Duration::from_millis(250));
            }
        }
    }

    let mut files = list_jpgs(out_dir)?;
    files.sort();
    let frames = files
        .into_iter()
        .enumerate()
        .map(|(index, path)| {
            let time = index as f64 / sample_fps.max(0.1);
            FrameThumb {
                frame: (time * src_fps).round() as i64,
                time,
                path: path.to_string_lossy().to_string(),
            }
        })
        .collect();
    on_progress(1.0);
    Ok(frames)
}

fn is_jpg(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("jpg"))
        .unwrap_or(false)
}

fn clear_jpgs(dir: &Path) -> DomainResult<()> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in std::fs::read_dir(dir).map_err(repo)? {
        let path = entry.map_err(repo)?.path();
        if is_jpg(&path) {
            let _ = std::fs::remove_file(path);
        }
    }
    Ok(())
}

fn count_jpgs(dir: &Path) -> usize {
    std::fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .filter(|e| is_jpg(&e.path()))
                .count()
        })
        .unwrap_or(0)
}

fn list_jpgs(dir: &Path) -> DomainResult<Vec<std::path::PathBuf>> {
    let mut files = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(repo)? {
        let path = entry.map_err(repo)?.path();
        if is_jpg(&path) {
            files.push(path);
        }
    }
    Ok(files)
}
