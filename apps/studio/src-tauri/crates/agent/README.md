# vailabel-agent

A small service you install on a training machine — typically a Linux GPU
server — so Vailabel Studio can train there instead of on your desktop.

Studio connects to the agent (the agent never calls out): it uploads the
project's dataset, the agent queues and trains the run with the same Python
trainer the desktop app uses, and Studio downloads the trained weights back
into the project. From then on the run behaves like a local one — reports,
ONNX export and "use for auto-label" all work.

```
Studio (desktop)  ──HTTP + token──▶  vailabel-agent :8765  ──▶  Python trainer (loopback only)
   dataset ─────────────────────────▶ queue → train
   weights, logs, plots ◀──────────── when finished
```

## Install (Linux)

You need Rust (to build), Python 3.10+ with `venv`, and for GPU training an
NVIDIA driver that PyTorch supports.

```bash
# 1. Build on the server (or any Linux box with the same architecture).
git clone https://github.com/vailabel/vailabel-studio
cd vailabel-studio/apps/studio/src-tauri
cargo build --release -p vailabel-agent
sudo install -m 755 target/release/vailabel-agent /usr/local/bin/

# 2. Create the config and access token (prints what to enter in Studio).
sudo vailabel-agent init --name "GPU server"

# 3. Install the trainer: a virtualenv with PyTorch + ultralytics.
#    Downloads a few GB; run it once.
sudo vailabel-agent setup-python

# 4. Install and start the systemd service.
sudo vailabel-agent install-service
```

Check it: `systemctl status vailabel-agent`, logs with
`journalctl -u vailabel-agent -f`, and from another machine
`curl http://<server>:8765/healthz` → `{"ok":true}`.

The binary is self-contained: the Python trainer sources are compiled into it
and unpacked to the data directory on start, so upgrading is replacing
`/usr/local/bin/vailabel-agent` and `sudo systemctl restart vailabel-agent`.

### Files

| Path | What |
| --- | --- |
| `/etc/vailabel-agent/config.json` | Name, listen address, token (mode 600) |
| `/var/lib/vailabel-agent/jobs/` | One folder per job: dataset, weights, logs |
| `/var/lib/vailabel-agent/venv/` | The Python environment |

Run as a non-root user with `install-service --user <name>`; that user must
own the data directory. Without `sudo`, `init` uses `~/.config/vailabel-agent`
and `~/.local/share/vailabel-agent`, and `vailabel-agent run` starts it in the
foreground — handy for a first try.

## Connect Studio

1. On the server: `sudo vailabel-agent info` shows the port and token.
2. In Studio: **Settings → AI Runtime → Training agents → Add agent**. Enter
   `http://<server-address>:8765` and the token, then **Test connection**.
3. Train on it: pick the agent under **Run on** in the training dialog, or set
   it per project in **Project → Settings → Training** (which also holds the
   automatic-retraining switch).

## Security

- Every API call needs the token. Treat it like a password; `init --force`
  issues a new one.
- The agent speaks plain HTTP, so the token and your data cross the network
  unencrypted. Run it on a network you trust (LAN, VPN, SSH tunnel), or put a
  TLS reverse proxy in front and register the `https://` address in Studio.
- Only the agent's port is exposed. The Python trainer listens on loopback
  behind its own random token.
- Restrict who can reach the port, e.g. `sudo ufw allow from <your-ip> to any port 8765`.

## Behaviour worth knowing

- **One job at a time** by default; more wait in a FIFO queue. Change
  `maxConcurrent` in the config if the machine has several GPUs.
- **Uploads are capped** at `maxUploadMb` (default 50 GB).
- **Restarts fail the running job.** Training state lives in the Python
  process; if the agent or server restarts mid-run, that run is marked failed
  and queued jobs carry on.
- **Studio is the record.** After Studio has downloaded a finished run's
  results it deletes the job from the agent, so the disk doesn't fill up. A job
  Studio never collects stays in `jobs/` until you remove it.

## HTTP API

All routes except `/healthz` are under `/v1` and need
`Authorization: Bearer <token>`. Types are in `crates/agent-client`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Liveness, no auth |
| GET | `/v1/agent` | Name, version, GPU, queue length |
| POST | `/v1/jobs` | Register a job |
| PUT | `/v1/jobs/{id}/dataset?entry=data.yaml` | Upload the dataset (tar) |
| PUT | `/v1/jobs/{id}/weights` | Upload weights to fine-tune from |
| POST | `/v1/jobs/{id}/start` | Queue the job |
| POST | `/v1/jobs/{id}/stop` | Cancel |
| GET | `/v1/jobs`, `/v1/jobs/{id}` | Status, progress, metrics |
| GET | `/v1/jobs/{id}/logs?offset=` | Incremental log |
| GET | `/v1/jobs/{id}/artifacts` | Weights, results, plots (tar) |
| DELETE | `/v1/jobs/{id}` | Remove a finished job |

## Uninstall

```bash
sudo vailabel-agent uninstall-service
sudo rm -rf /usr/local/bin/vailabel-agent /etc/vailabel-agent /var/lib/vailabel-agent
```
