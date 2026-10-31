//! `vailabel-agent` command line.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::ExitCode;

use vailabel_agent::config::{default_config_path, default_data_dir, AgentConfig};
use vailabel_agent::{python, service};

const USAGE: &str = "\
vailabel-agent — self-hosted training agent for Vailabel Studio

USAGE:
    vailabel-agent <command> [options]

COMMANDS:
    init               Create the config file and access token
    setup-python       Create the Python environment and install the trainer
    run                Run the agent in the foreground
    info               Show the address and token to register in Studio
    install-service    Install and start the systemd service (Linux, needs sudo)
    uninstall-service  Stop and remove the systemd service

OPTIONS (all commands):
    --config <path>    Config file (default: /etc/vailabel-agent/config.json as
                       root, ~/.config/vailabel-agent/config.json otherwise)

init:
    --name <name>      Name shown in Studio (default: this machine's hostname)
    --bind <addr>      Listen address (default: 0.0.0.0:8765)
    --data-dir <path>  Where jobs and the Python environment live
    --python <path>    Use an existing interpreter instead of `setup-python`
    --force            Overwrite an existing config (generates a NEW token)

setup-python:
    --python <path>    Interpreter to build the environment from (default: python3)

install-service:
    --user <name>      Run the service as this user (default: root)
    --no-start         Write the unit file without enabling or starting it
";

struct Args {
    command: String,
    options: HashMap<String, String>,
    flags: Vec<String>,
}

const FLAGS: &[&str] = &["force", "no-start", "help"];

fn parse_args() -> Result<Args, String> {
    let mut raw = std::env::args().skip(1);
    let command = raw.next().unwrap_or_else(|| "help".into());
    let mut options = HashMap::new();
    let mut flags = Vec::new();
    while let Some(arg) = raw.next() {
        let Some(name) = arg.strip_prefix("--") else {
            return Err(format!("Unexpected argument `{arg}`."));
        };
        if FLAGS.contains(&name) {
            flags.push(name.to_string());
        } else {
            let value = raw
                .next()
                .ok_or_else(|| format!("`--{name}` needs a value."))?;
            options.insert(name.to_string(), value);
        }
    }
    Ok(Args {
        command,
        options,
        flags,
    })
}

impl Args {
    fn path(&self, name: &str) -> Option<PathBuf> {
        self.options.get(name).map(PathBuf::from)
    }
    fn flag(&self, name: &str) -> bool {
        self.flags.iter().any(|flag| flag == name)
    }
    fn config_path(&self) -> PathBuf {
        self.path("config").unwrap_or_else(default_config_path)
    }
}

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .ok()
        .or_else(|| {
            std::fs::read_to_string("/etc/hostname")
                .ok()
                .map(|name| name.trim().to_string())
        })
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "training-agent".into())
}

fn print_registration(config: &AgentConfig) {
    let port = config.bind.rsplit(':').next().unwrap_or("8765");
    println!("Register this agent in Studio → Settings → AI Runtime → Training agents:");
    println!("  Name:    {}", config.name);
    println!("  Address: http://<this-machine's-address>:{port}");
    println!("  Token:   {}", config.token);
}

fn init(args: &Args) -> Result<(), String> {
    let path = args.config_path();
    if path.exists() && !args.flag("force") {
        return Err(format!(
            "{} already exists. Use --force to replace it (this creates a new token).",
            path.display()
        ));
    }
    let data_dir = args.path("data-dir").unwrap_or_else(default_data_dir);
    let python = args
        .path("python")
        .unwrap_or_else(|| python::venv_python(&data_dir.join("venv")));
    let mut config = AgentConfig::new(
        args.options.get("name").cloned().unwrap_or_else(hostname),
        data_dir,
        python,
    );
    if let Some(bind) = args.options.get("bind") {
        config.bind = bind.clone();
    }
    config.save(&path)?;
    println!("Wrote {}\n", path.display());
    print_registration(&config);
    if !config.python.exists() {
        println!("\nNext: `vailabel-agent setup-python` to install the trainer.");
    }
    Ok(())
}

fn setup_python(args: &Args) -> Result<(), String> {
    let path = args.config_path();
    let mut config = AgentConfig::load(&path)?;
    let base = args
        .path("python")
        .unwrap_or_else(|| PathBuf::from("python3"));
    println!(
        "Creating the Python environment in {} (this downloads PyTorch; it can take a while)…",
        config.venv_dir().display()
    );
    config.python = python::setup_venv(&base, &config.venv_dir(), &config.runtime_dir())?;
    config.save(&path)?;
    println!("\nPython environment ready: {}", config.python.display());
    Ok(())
}

fn run(args: &Args) -> Result<(), String> {
    let config = AgentConfig::load(&args.config_path())?;
    if !config.python.exists() {
        return Err(format!(
            "No Python interpreter at {}. Run `vailabel-agent setup-python` first.",
            config.python.display()
        ));
    }
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?
        .block_on(vailabel_agent::run(config))
}

fn dispatch(args: &Args) -> Result<(), String> {
    if args.flag("help") {
        print!("{USAGE}");
        return Ok(());
    }
    match args.command.as_str() {
        "init" => init(args),
        "setup-python" => setup_python(args),
        "run" => run(args),
        "info" => {
            print_registration(&AgentConfig::load(&args.config_path())?);
            Ok(())
        }
        "install-service" => {
            let unit = service::install(
                &args.config_path(),
                args.options.get("user").map(String::as_str),
                !args.flag("no-start"),
            )?;
            println!("Installed {}", unit.display());
            println!("Logs: journalctl -u {} -f", service::UNIT_NAME);
            Ok(())
        }
        "uninstall-service" => service::uninstall(),
        "help" | "--help" | "-h" => {
            print!("{USAGE}");
            Ok(())
        }
        other => Err(format!("Unknown command `{other}`.\n\n{USAGE}")),
    }
}

fn main() -> ExitCode {
    match parse_args().and_then(|args| dispatch(&args)) {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("error: {message}");
            ExitCode::FAILURE
        }
    }
}
