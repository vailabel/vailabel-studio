//! The archive format datasets and training artifacts travel in: a plain tar of
//! regular files, with paths relative to the directory that was packed.
//!
//! Unpacking treats the archive as untrusted (the agent receives uploads over
//! the network; Studio receives whatever an agent sends back): only regular
//! files and directories are accepted, and nothing may land outside `dest`.

use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::{Component, Path};

use crate::error::{AgentError, Result};

/// Pack every file under `dir` into a tar at `out`, paths relative to `dir`.
pub fn pack_dir(dir: &Path, out: &Path) -> Result<()> {
    let mut builder = tar::Builder::new(BufWriter::new(File::create(out)?));
    builder.follow_symlinks(true);
    builder.append_dir_all(".", dir)?;
    builder.into_inner()?;
    Ok(())
}

/// Pack only the listed files (relative to `dir`) that exist. Returns how many
/// were written.
pub fn pack_files(dir: &Path, relative: &[&str], out: &Path) -> Result<usize> {
    let mut builder = tar::Builder::new(BufWriter::new(File::create(out)?));
    let mut written = 0;
    for name in relative {
        let path = dir.join(name);
        if path.is_file() {
            builder.append_path_with_name(&path, name)?;
            written += 1;
        }
    }
    builder.into_inner()?;
    Ok(written)
}

fn is_contained(path: &Path) -> bool {
    path.components()
        .all(|part| matches!(part, Component::Normal(_) | Component::CurDir))
}

/// Unpack `archive` into `dest`, refusing links, devices and any path that would
/// escape `dest`. Returns the number of files written.
pub fn unpack(archive: &Path, dest: &Path) -> Result<usize> {
    std::fs::create_dir_all(dest)?;
    let mut tar = tar::Archive::new(BufReader::new(File::open(archive)?));
    let mut files = 0;
    for entry in tar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        let kind = entry.header().entry_type();
        if !is_contained(&path) {
            return Err(AgentError::UnsafeArchive(path.display().to_string()));
        }
        if kind.is_dir() {
            std::fs::create_dir_all(dest.join(&path))?;
        } else if kind.is_file() {
            // `unpack_in` re-checks containment against the real filesystem.
            if !entry.unpack_in(dest)? {
                return Err(AgentError::UnsafeArchive(path.display().to_string()));
            }
            files += 1;
        } else {
            return Err(AgentError::UnsafeArchive(format!(
                "{} ({:?})",
                path.display(),
                kind
            )));
        }
    }
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_a_nested_directory() {
        let src = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(src.path().join("images/train")).unwrap();
        std::fs::write(src.path().join("data.yaml"), "names: [car]").unwrap();
        std::fs::write(src.path().join("images/train/a.jpg"), b"jpeg").unwrap();

        let work = tempfile::tempdir().unwrap();
        let tar_path = work.path().join("d.tar");
        pack_dir(src.path(), &tar_path).unwrap();
        let out = work.path().join("out");

        assert_eq!(unpack(&tar_path, &out).unwrap(), 2);
        assert_eq!(
            std::fs::read(out.join("images/train/a.jpg")).unwrap(),
            b"jpeg"
        );
        assert_eq!(
            std::fs::read_to_string(out.join("data.yaml")).unwrap(),
            "names: [car]"
        );
    }

    #[test]
    fn packs_only_the_listed_files_that_exist() {
        let src = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(src.path().join("weights")).unwrap();
        std::fs::write(src.path().join("weights/best.pt"), b"w").unwrap();
        std::fs::write(src.path().join("secret.txt"), b"no").unwrap();
        let work = tempfile::tempdir().unwrap();
        let tar_path = work.path().join("a.tar");

        let written =
            pack_files(src.path(), &["weights/best.pt", "results.csv"], &tar_path).unwrap();
        let out = work.path().join("out");
        unpack(&tar_path, &out).unwrap();

        assert_eq!(written, 1);
        assert!(out.join("weights/best.pt").exists());
        assert!(!out.join("secret.txt").exists());
    }

    #[test]
    fn refuses_entries_that_escape_the_destination() {
        let work = tempfile::tempdir().unwrap();
        let tar_path = work.path().join("evil.tar");
        {
            // Write the header by hand: the builder API refuses `..` itself.
            let mut header = tar::Header::new_gnu();
            let name = b"../escape.txt";
            header.as_old_mut().name[..name.len()].copy_from_slice(name);
            header.set_size(4);
            header.set_entry_type(tar::EntryType::Regular);
            header.set_mode(0o644);
            header.set_cksum();
            let mut builder = tar::Builder::new(File::create(&tar_path).unwrap());
            builder.append(&header, &b"evil"[..]).unwrap();
            builder.into_inner().unwrap();
        }
        let out = work.path().join("out");

        assert!(matches!(
            unpack(&tar_path, &out),
            Err(AgentError::UnsafeArchive(_))
        ));
        assert!(!work.path().join("escape.txt").exists());
    }

    #[test]
    fn refuses_symlinks() {
        let work = tempfile::tempdir().unwrap();
        let tar_path = work.path().join("link.tar");
        {
            let mut header = tar::Header::new_gnu();
            header.set_entry_type(tar::EntryType::Symlink);
            header.set_size(0);
            let mut builder = tar::Builder::new(File::create(&tar_path).unwrap());
            builder
                .append_link(&mut header, "link", "/etc/passwd")
                .unwrap();
            builder.into_inner().unwrap();
        }

        assert!(matches!(
            unpack(&tar_path, &work.path().join("out")),
            Err(AgentError::UnsafeArchive(_))
        ));
    }
}
