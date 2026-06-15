//! Dependency-rule tests.
//!
//! These assert the Clean-Architecture dependency rule structurally:
//! the *pure* crates (core, shared, plugin, and the module crates) must contain
//! no infrastructure imports and no infrastructure dependencies. Infrastructure
//! lives in the binary (the composition root) and the runtime ACL crate, which
//! are intentionally excluded here.

use std::fs;
use std::path::{Path, PathBuf};

/// Crates whose entire `src/` must be free of infrastructure concerns.
///
/// Excluded by design: `runtime`/`runtime-manager` (the Python-runtime ACL,
/// which legitimately uses reqwest/tokio), `arch-tests`, and the binary.
const PURE_CRATES: &[&str] = &[
    "core",
    "shared",
    "plugin",
    "project",
    "dataset",
    "analysis",
    "video",
    "models",
    "copilot",
    "annotation",
    "search",
    "training",
];

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

/// Forbidden dependency crate names in a pure crate's `Cargo.toml`.
const FORBIDDEN_DEPS: &[&str] = &[
    "diesel",
    "tauri",
    "rusqlite",
    "reqwest",
    "opendal",
    "ort",
    "libsqlite3-sys",
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

#[test]
fn pure_crates_have_no_infrastructure_imports() {
    let crates = crates_dir();
    let mut violations = Vec::new();

    for krate in PURE_CRATES {
        let src = crates.join(krate).join("src");
        let mut files = Vec::new();
        collect_rs_files(&src, &mut files);
        // Guard against a silently-broken walk: every pure crate has source to
        // scan, so finding none means the test isn't actually checking anything.
        assert!(
            !files.is_empty(),
            "no .rs files found under {} — the scanner is not inspecting this crate",
            src.display()
        );
        for file in files {
            let code = strip_line_comments(&fs::read_to_string(&file).expect("read source"));
            for token in FORBIDDEN_USAGES {
                if code.contains(token) {
                    violations.push(format!(
                        "{} uses forbidden `{}`",
                        file.display(),
                        token
                    ));
                }
            }
        }
    }

    assert!(
        violations.is_empty(),
        "Clean-Architecture dependency-rule violations (infrastructure in a pure crate):\n{}",
        violations.join("\n")
    );
}

#[test]
fn pure_crates_have_no_infrastructure_dependencies() {
    let crates = crates_dir();
    let mut violations = Vec::new();

    for krate in PURE_CRATES {
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
        "Pure crates must not depend on infrastructure crates:\n{}",
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
}

#[test]
fn core_is_the_dependency_root() {
    let manifest =
        fs::read_to_string(crates_dir().join("core").join("Cargo.toml")).expect("read core manifest");
    let deps = dependencies_block(&manifest);
    assert!(
        !deps.contains("vailabel"),
        "vailabel-core is the dependency root and must not depend on any internal crate:\n{}",
        deps
    );
}
