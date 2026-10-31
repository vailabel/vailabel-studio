//! The Python side of the agent: the trainer sources (compiled into the agent
//! binary, so deploying is copying one file) and the virtualenv they run in.

use std::path::{Path, PathBuf};
use std::process::Command;

use include_dir::{include_dir, Dir, DirEntry};

/// The same FastAPI runtime the desktop app ships (`resources/runtime`).
static RUNTIME: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../../resources/runtime");

/// Packages the agent needs — a training-only subset of the desktop's list.
const REQUIREMENTS: &str = include_str!("../requirements-agent.txt");

/// Directories that are not needed to run the runtime.
const SKIPPED_DIRS: &[&str] = &["__pycache__", "tests", ".pytest_cache"];

fn is_skipped(path: &Path) -> bool {
    path.components().any(|part| {
        part.as_os_str()
            .to_str()
            .is_some_and(|name| SKIPPED_DIRS.contains(&name))
    })
}

fn write_entries(dir: &Dir<'_>, dest: &Path) -> std::io::Result<usize> {
    let mut written = 0;
    for entry in dir.entries() {
        if is_skipped(entry.path()) {
            continue;
        }
        match entry {
            DirEntry::Dir(child) => written += write_entries(child, dest)?,
            DirEntry::File(file) => {
                let target = dest.join(file.path());
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::write(target, file.contents())?;
                written += 1;
            }
        }
    }
    Ok(written)
}

/// Write the bundled runtime sources to `dest`, replacing what is there, so the
/// files on disk always match this agent build. Returns the entry point.
pub fn install_runtime(dest: &Path) -> std::io::Result<PathBuf> {
    if dest.exists() {
        std::fs::remove_dir_all(dest)?;
    }
    std::fs::create_dir_all(dest)?;
    write_entries(&RUNTIME, dest)?;
    std::fs::write(dest.join("requirements-agent.txt"), REQUIREMENTS)?;
    Ok(dest.join("app.py"))
}

pub fn venv_python(venv: &Path) -> PathBuf {
    if cfg!(windows) {
        venv.join("Scripts").join("python.exe")
    } else {
        venv.join("bin").join("python")
    }
}

fn run(command: &mut Command, what: &str) -> Result<(), String> {
    let status = command
        .status()
        .map_err(|e| format!("Could not run {what}: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{what} failed ({status})."))
    }
}

/// Create a virtualenv at `venv` with `base_python` and install the training
/// requirements into it. Output streams to the terminal — the torch download
/// alone takes minutes. Returns the venv's interpreter.
pub fn setup_venv(base_python: &Path, venv: &Path, runtime_dir: &Path) -> Result<PathBuf, String> {
    install_runtime(runtime_dir).map_err(|e| e.to_string())?;
    if !venv_python(venv).exists() {
        run(
            Command::new(base_python).arg("-m").arg("venv").arg(venv),
            "python -m venv",
        )?;
    }
    let python = venv_python(venv);
    run(
        Command::new(&python).args(["-m", "pip", "install", "--upgrade", "pip"]),
        "pip upgrade",
    )?;
    run(
        Command::new(&python)
            .args(["-m", "pip", "install", "-r"])
            .arg(runtime_dir.join("requirements-agent.txt")),
        "pip install",
    )?;
    Ok(python)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installs_the_runtime_without_tests_or_caches() {
        let dir = tempfile::tempdir().unwrap();
        let dest = dir.path().join("runtime");
        std::fs::create_dir_all(dest.join("stale")).unwrap();

        let entry = install_runtime(&dest).unwrap();

        assert!(entry.is_file());
        assert!(dest.join("routers/training.py").is_file());
        assert!(dest.join("training/ultralytics_trainer.py").is_file());
        assert!(dest.join("requirements-agent.txt").is_file());
        assert!(!dest.join("tests").exists());
        assert!(!dest.join("stale").exists(), "old files are replaced");
    }
}
