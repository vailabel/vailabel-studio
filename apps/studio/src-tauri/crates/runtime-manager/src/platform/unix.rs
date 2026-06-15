use crate::error::{Result, RuntimeError};

/// Put the child in its own session/process group so we can signal the whole
/// group on teardown.
pub fn configure_command(cmd: &mut tokio::process::Command) {
    // Safety: `setsid`/`setpgid` are async-signal-safe and used here only to
    // detach the child into its own process group before exec.
    unsafe {
        cmd.pre_exec(|| {
            if libc::setsid() == -1 {
                // Already a group leader → fall back to a fresh group.
                libc::setpgid(0, 0);
            }
            Ok(())
        });
    }
}

/// Stores the child's process-group id (== pid after `setsid`).
pub struct ProcessGuard {
    pgid: i32,
}

pub fn assign_to_guard(child: &tokio::process::Child) -> Result<ProcessGuard> {
    let pid = child
        .id()
        .ok_or_else(|| RuntimeError::Spawn("child has no pid".into()))? as i32;
    Ok(ProcessGuard { pgid: pid })
}

impl ProcessGuard {
    pub fn term_tree(&self) {
        unsafe {
            libc::kill(-self.pgid, libc::SIGTERM);
        }
    }

    pub fn kill_tree(&self) {
        unsafe {
            libc::kill(-self.pgid, libc::SIGKILL);
        }
    }
}

impl Drop for ProcessGuard {
    fn drop(&mut self) {
        // Best-effort: ensure no orphaned workers survive the app.
        self.kill_tree();
    }
}
