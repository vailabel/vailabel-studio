use std::ffi::c_void;

use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, SetInformationJobObject,
    JobObjectExtendedLimitInformation, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

use crate::error::{Result, RuntimeError};

/// Don't pop a console window for the headless runtime.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn configure_command(cmd: &mut tokio::process::Command) {
    cmd.creation_flags(CREATE_NO_WINDOW);
}

/// Holds the Job Object handle for the runtime's lifetime. Dropping it closes
/// the handle, which (with `KILL_ON_JOB_CLOSE`) terminates the whole tree.
pub struct ProcessGuard {
    job: HANDLE,
}

// The handle is only ever closed; manual Send/Sync is sound for our usage.
unsafe impl Send for ProcessGuard {}
unsafe impl Sync for ProcessGuard {}

pub fn assign_to_guard(child: &tokio::process::Child) -> Result<ProcessGuard> {
    unsafe {
        let job = CreateJobObjectW(None, PCWSTR::null())
            .map_err(|e| RuntimeError::Spawn(format!("CreateJobObject failed: {e}")))?;

        let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
        .map_err(|e| RuntimeError::Spawn(format!("SetInformationJobObject failed: {e}")))?;

        let raw = child
            .raw_handle()
            .ok_or_else(|| RuntimeError::Spawn("child has no raw handle".into()))?;
        let hprocess = HANDLE(raw as *mut c_void);
        AssignProcessToJobObject(job, hprocess)
            .map_err(|e| RuntimeError::Spawn(format!("AssignProcessToJobObject failed: {e}")))?;

        Ok(ProcessGuard { job })
    }
}

impl ProcessGuard {
    /// On Windows the Job Object already enforces tree-kill on handle close;
    /// these are no-ops kept for API parity with the Unix guard.
    pub fn kill_tree(&self) {}
    pub fn term_tree(&self) {}
}

impl Drop for ProcessGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseHandle(self.job);
        }
    }
}
