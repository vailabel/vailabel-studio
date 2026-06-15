use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::types::RuntimeMetrics;

/// Samples CPU/RAM of the runtime process (by PID) and GPU via `nvidia-smi`.
/// Holds a `System` across calls so `cpu_usage()` reflects the delta over the
/// monitor interval.
pub struct MetricsSampler {
    sys: System,
}

impl Default for MetricsSampler {
    fn default() -> Self {
        Self::new()
    }
}

impl MetricsSampler {
    pub fn new() -> Self {
        Self { sys: System::new() }
    }

    pub fn sample(&mut self, pid: u32) -> RuntimeMetrics {
        let p = Pid::from_u32(pid);
        self.sys
            .refresh_processes(ProcessesToUpdate::Some(&[p]), true);

        let mut m = RuntimeMetrics::default();
        if let Some(proc_) = self.sys.process(p) {
            m.cpu = proc_.cpu_usage();
            m.ram_mb = proc_.memory() / (1024 * 1024);
        }
        if let Some(g) = nvidia_smi_sample() {
            m.gpu_util = g.0;
            m.vram_used_mb = g.1;
            m.vram_total_mb = g.2;
        }
        m
    }
}

/// (util%, vram_used_mb, vram_total_mb)
type GpuSample = (Option<f32>, Option<u64>, Option<u64>);

fn nvidia_smi_sample() -> Option<GpuSample> {
    let mut cmd = std::process::Command::new("nvidia-smi");
    cmd.args([
        "--query-gpu=utilization.gpu,memory.used,memory.total",
        "--format=csv,noheader,nounits",
    ]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let out = cmd.output().ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next()?;
    let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
    if parts.len() < 3 {
        return None;
    }
    Some((
        parts[0].parse().ok(),
        parts[1].parse().ok(),
        parts[2].parse().ok(),
    ))
}
