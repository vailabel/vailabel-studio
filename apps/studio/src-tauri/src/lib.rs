#![recursion_limit = "256"]

mod shared;
pub use shared::{emit_domain_event, now_iso};
pub(crate) use shared::{
    as_object_mut, emit_domain_event_for_ids, merge_patch, read_secret, value_string,
};

pub mod features;

use features::ai::service::AiService;
use features::analysis::service::AnalysisService;
use features::dataset::service::DatasetService;
use features::video::service::VideoService;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde::Serialize;
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};


/// Embedded schema migrations (the `migrations/` folder, resolved relative to
/// this crate's manifest). Run once at startup before any repository touches the
/// database, so `migrations/` is the single source of truth for the schema.
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

#[derive(Clone)]
pub struct AppState {
    pub project_service: Arc<vailabel_project::application::ProjectAppService>,
    pub label_service: Arc<vailabel_annotation::application::LabelClassAppService>,
    pub image_service: Arc<vailabel_dataset::application::ImageAppService>,
    pub ai_service: Arc<AiService>,
    pub analysis_service: Arc<AnalysisService>,
    pub video_service: Arc<VideoService>,
    pub runtime_service: Arc<runtime_manager::RuntimeService>,
    pub plugin_registry: Arc<Mutex<vailabel_plugin::PluginRegistry>>,
    pub training_service: Arc<vailabel_training::application::TrainingAppService>,
    pub copilot_service: Arc<vailabel_copilot::application::CopilotAppService>,
    pub settings_service: Arc<vailabel_workspace::application::SettingAppService>,
    pub history_service: Arc<vailabel_workspace::application::HistoryAppService>,
    pub secret_key_service: Arc<vailabel_workspace::application::SecretKeyAppService>,
    pub annotation_service: Arc<vailabel_annotation::application::AnnotationAppService>,
    pub runtime_model_repo: Arc<dyn vailabel_models::domain::RuntimeModelRepository>,
    /// Dataset YOLO import/export orchestration (owns the label/image/annotation
    /// repos it touches).
    pub dataset_service: Arc<DatasetService>,
    /// Typed module repositories the runtime command handlers persist through
    /// directly (trained-model registration, project class names).
    pub ai_model_repo: Arc<dyn vailabel_models::domain::AiModelRepository>,
    pub label_repo: Arc<dyn vailabel_annotation::domain::LabelRepository>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Yaml(#[from] serde_yaml::Error),
    #[error(transparent)]
    Keyring(#[from] keyring::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error(transparent)]
    Runtime(#[from] runtime_manager::RuntimeError),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}


pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let startup_t0 = std::time::Instant::now();
            eprintln!("[startup] backend setup begin");

            let app_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_dir)?;
            // One shared SQLite connection: the residual DesktopStore and the
            // per-module Diesel repositories all borrow this `Db`.
            let db = vailabel_db::Db::open(app_dir.join("vailabel-desktop.sqlite"))?;
            // Apply embedded schema migrations once, before any repository touches
            // the database. `migrations/` is the single source of truth; the
            // migrations are idempotent so this is safe on databases created
            // before the migration runner existed.
            db.lock()
                .run_pending_migrations(MIGRATIONS)
                .map_err(|e| AppError::Message(format!("schema migration failed: {e}")))?;
            eprintln!(
                "[startup] db ready ({} ms)",
                startup_t0.elapsed().as_millis()
            );

            // Project module: a typed Diesel repository over the shared `db`,
            // plus a Tauri-backed EventPublisher. The binary's ProjectService is
            // a thin facade over the ProjectAppService.
            // Domain events fan out through an in-process bus to its subscribers;
            // the Tauri subscriber emits on `studio://domain-event` (wire format
            // unchanged). Add more subscribers (audit, integrations) here later.
            let event_subscribers: Vec<Arc<dyn vailabel_shared::EventSubscriber>> = vec![Arc::new(
                crate::shared::composition::TauriEventSubscriber::new(app.handle().clone()),
            )];
            let event_publisher: Arc<dyn vailabel_shared::EventPublisher> =
                Arc::new(vailabel_shared::EventBus::new(event_subscribers));
            let project_repo: Arc<dyn vailabel_project::domain::ProjectRepository> = Arc::new(
                vailabel_project::infrastructure::DieselProjectRepository::new(db.clone()),
            );
            // Command handlers call these crate application services directly
            // (no binary facade); they are held in `AppState`.
            let project_service = Arc::new(vailabel_project::application::ProjectAppService::new(
                project_repo,
                event_publisher.clone(),
            ));
            let label_repo: Arc<dyn vailabel_annotation::domain::LabelRepository> = Arc::new(
                vailabel_annotation::infrastructure::DieselLabelRepository::new(db.clone()),
            );
            let label_service = Arc::new(
                vailabel_annotation::application::LabelClassAppService::new(
                    label_repo.clone(),
                    event_publisher.clone(),
                ),
            );
            let image_repo: Arc<dyn vailabel_dataset::domain::ImageRepository> = Arc::new(
                vailabel_dataset::infrastructure::DieselImageRepository::new(db.clone()),
            );
            let image_service = Arc::new(vailabel_dataset::application::ImageAppService::new(
                image_repo.clone(),
                event_publisher.clone(),
            ));
            // Annotation shapes: typed Diesel repo over the shared `db` (also lent
            // to the analysis module for its source reads).
            let annotation_repo: Arc<dyn vailabel_annotation::domain::AnnotationRepository> =
                Arc::new(vailabel_annotation::infrastructure::DieselAnnotationRepository::new(
                    db.clone(),
                ));
            // Workspace module: app-level settings / undo-redo history / keychain
            // secret-key registry, each a typed Diesel repository over the shared
            // `db`. Settings + history publish through the same event bus.
            let settings_repo: Arc<dyn vailabel_workspace::domain::SettingRepository> = Arc::new(
                vailabel_workspace::infrastructure::DieselSettingRepository::new(db.clone()),
            );
            let settings_service = Arc::new(
                vailabel_workspace::application::SettingAppService::new(
                    settings_repo.clone(),
                    event_publisher.clone(),
                ),
            );
            let history_repo: Arc<dyn vailabel_workspace::domain::HistoryRepository> = Arc::new(
                vailabel_workspace::infrastructure::DieselHistoryRepository::new(db.clone()),
            );
            let history_service = Arc::new(
                vailabel_workspace::application::HistoryAppService::new(
                    history_repo,
                    event_publisher.clone(),
                ),
            );
            let secret_key_repo: Arc<dyn vailabel_workspace::domain::SecretKeyRepository> = Arc::new(
                vailabel_workspace::infrastructure::DieselSecretKeyRepository::new(db.clone()),
            );
            let secret_key_service = Arc::new(
                vailabel_workspace::application::SecretKeyAppService::new(secret_key_repo),
            );
            // Managed-model registries + AI predictions: typed Diesel repos over
            // the shared `db`.
            let ai_model_repo: Arc<dyn vailabel_models::domain::AiModelRepository> = Arc::new(
                vailabel_models::infrastructure::DieselAiModelRepository::new(db.clone()),
            );
            let prediction_repo: Arc<dyn vailabel_annotation::domain::PredictionRepository> =
                Arc::new(vailabel_annotation::infrastructure::DieselPredictionRepository::new(
                    db.clone(),
                ));
            let runtime_model_repo: Arc<dyn vailabel_models::domain::RuntimeModelRepository> =
                Arc::new(vailabel_models::infrastructure::DieselRuntimeModelRepository::new(
                    db.clone(),
                ));
            // The annotation use-case service (annotations CRUD + events), driving
            // the entities IPC commands.
            let annotation_service = Arc::new(
                vailabel_annotation::application::AnnotationAppService::new(
                    annotation_repo.clone(),
                    event_publisher.clone(),
                ),
            );
            // Embedded AI Runtime. Constructed before AiService so the detection /
            // segmentation path can call into the Python runtime, and eager-started
            // (after `app.manage`, below) so it's ready on first use. The monitor
            // loop runs regardless and reports `stopped` until it's up.
            let runtime_config = crate::features::runtime::glue::build_config(app.handle())?;
            let runtime_service =
                Arc::new(runtime_manager::RuntimeService::new(runtime_config));
            let ai_service = Arc::new(crate::features::ai::service::AiService::new(
                runtime_service.clone(),
                ai_model_repo.clone(),
                prediction_repo.clone(),
                annotation_repo.clone(),
                label_repo.clone(),
                image_repo.clone(),
            ));
            // Dataset YOLO import/export adapter: owns the label/image/annotation
            // repos it walks, so the dataset commands stay thin.
            let dataset_service = Arc::new(crate::features::dataset::service::DatasetService::new(
                label_repo.clone(),
                image_repo.clone(),
                annotation_repo.clone(),
            ));
            // Analysis module: source rows are read through the owning module
            // repositories and reports persist in the `analysis_reports` table —
            // both via the crate's own Diesel infrastructure. The pixel decoder is
            // the crate's infrastructure; the binary AnalysisService owns the job
            // lifecycle.
            let analysis_repo: Arc<dyn vailabel_analysis::domain::AnalysisRepository> = Arc::new(
                vailabel_analysis::infrastructure::DieselAnalysisRepository::new(
                    db.clone(),
                    image_repo.clone(),
                    annotation_repo.clone(),
                    label_repo.clone(),
                ),
            );
            let analysis_decoder: Arc<dyn vailabel_analysis::application::ImageDecoder> =
                Arc::new(vailabel_analysis::infrastructure::ImageQualityDecoder::new());
            let analysis_app_service = Arc::new(vailabel_analysis::application::AnalysisAppService::new(
                analysis_repo,
                analysis_decoder,
            ));
            let analysis_service = Arc::new(
                crate::features::analysis::service::AnalysisService::new(analysis_app_service),
            );
            // Video module: persistence is a binary adapter over the residual
            // store; the FFmpeg pipeline is the crate's infrastructure. The
            // binary VideoService owns only the ingest job lifecycle.
            let video_repo: Arc<dyn vailabel_video::domain::VideoRepository> = Arc::new(
                vailabel_video::infrastructure::DieselVideoRepository::new(db.clone()),
            );
            let video_pipeline: Arc<dyn vailabel_video::application::VideoPipeline> =
                Arc::new(vailabel_video::infrastructure::FfmpegPipeline::new());
            let video_app_service = Arc::new(vailabel_video::application::VideoAppService::new(
                video_repo,
                video_pipeline,
                app_dir.join("video-frames"),
            ));
            let video_service = Arc::new(crate::features::video::service::VideoService::new(
                video_app_service,
            ));

            // (runtime_service is constructed above, before AiService.)

            // Training module: typed Diesel repo over the shared `db`, the runtime
            // port backed by the runtime service, events via the shared publisher.
            let training_repo: Arc<dyn vailabel_training::domain::TrainingRepository> = Arc::new(
                vailabel_training::infrastructure::DieselTrainingRepository::new(db.clone())?,
            );
            let training_runtime: Arc<dyn vailabel_training::application::TrainingRuntime> =
                Arc::new(crate::features::training::runtime_port::BinaryTrainingRuntime::new(
                    runtime_service.clone(),
                ));
            let training_service = Arc::new(
                vailabel_training::application::TrainingAppService::new(
                    training_repo,
                    training_runtime,
                    event_publisher.clone(),
                ),
            );

            // Copilot module: the LLM brain (owns the resolution cache + reads
            // copilot settings/secret) and the grounding side (the AiService
            // predictions/pipeline engine + a cloned AppHandle + the typed repos
            // it reads) as ports behind the pure CopilotAppService.
            let copilot_llm: Arc<dyn vailabel_copilot::application::CopilotLlm> = Arc::new(
                crate::features::copilot::ports::BinaryCopilotLlm::new(settings_repo.clone()),
            );
            let copilot_inference: Arc<dyn vailabel_copilot::application::CopilotInference> =
                Arc::new(crate::features::copilot::ports::BinaryCopilotInference::new(
                    ai_service.clone(),
                    image_repo.clone(),
                    label_repo.clone(),
                    annotation_repo.clone(),
                    prediction_repo.clone(),
                    app.handle().clone(),
                ));
            let copilot_service = Arc::new(
                vailabel_copilot::application::CopilotAppService::new(
                    copilot_llm,
                    copilot_inference,
                ),
            );

            // Plugin framework: register the runtime-backed reference detector and
            // drive it install→load→enable. Surfaced to the UI via `plugins_list`.
            let plugin_registry = {
                let mut registry = vailabel_plugin::PluginRegistry::new();
                let detector = Arc::new(crate::features::plugins::detector::RuntimeDetectorPlugin::new(
                    runtime_service.clone(),
                ));
                registry.register_detector(detector)?;
                registry.load("runtime-detector")?;
                registry.enable("runtime-detector")?;
                Arc::new(Mutex::new(registry))
            };

            app.manage(AppState {
                project_service,
                label_service,
                image_service,
                ai_service,
                analysis_service,
                video_service,
                runtime_service: runtime_service.clone(),
                plugin_registry,
                training_service,
                copilot_service,
                settings_service,
                history_service,
                secret_key_service,
                annotation_service,
                runtime_model_repo,
                dataset_service,
                ai_model_repo,
                label_repo,
            });

            // Eager-start the embedded AI runtime in the background so detection,
            // segmentation, and the copilot are ready when the user first needs
            // them. Deferred a few seconds so spawning Python + importing PyTorch
            // (heavy CPU/disk) doesn't compete with the cold-start UI render — the
            // window should appear instantly. Inference still lazily starts it on
            // demand if the user reaches for AI before this fires. Non-fatal.
            let runtime_startup = runtime_service.clone();
            std::thread::spawn(move || {
                // Wait off the async runtime (no worker tied up), then kick off the
                // start once the UI has had time to render.
                std::thread::sleep(std::time::Duration::from_secs(3));
                tauri::async_runtime::spawn(async move {
                    let _ = runtime_startup.start().await;
                });
            });

            // 10s health/metrics loop → frontend events. On a terminal crash,
            // reconcile any in-flight training jobs to "failed".
            let monitor_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                runtime_service
                    .run_monitor(move |evt| {
                        let _ = monitor_handle.emit(evt.channel(), evt.payload());
                        if let runtime_manager::RuntimeEvent::Status(s) = &evt {
                            if s.give_up
                                || matches!(s.state, runtime_manager::RuntimeState::Crashed)
                            {
                                crate::features::runtime::glue::reconcile_jobs_on_crash(
                                    &monitor_handle,
                                );
                            }
                        }
                    })
                    .await;
            });
            eprintln!(
                "[startup] backend ready, window painting ({} ms)",
                startup_t0.elapsed().as_millis()
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            features::projects::commands::projects_list,
            features::projects::commands::projects_get,
            features::projects::commands::projects_save,
            features::projects::commands::projects_delete,
            features::annotation::commands::labels_list_by_project,
            features::annotation::commands::labels_save,
            features::annotation::commands::labels_delete,
            features::annotation::commands::annotations_list_by_project,
            features::annotation::commands::annotations_list_by_image,
            features::annotation::commands::annotations_save,
            features::annotation::commands::annotations_delete,
            features::workspace::commands::history_list_by_project,
            features::workspace::commands::history_save,
            features::workspace::commands::settings_list,
            features::workspace::commands::settings_get,
            features::workspace::commands::settings_set,
            features::workspace::commands::secret_set,
            features::workspace::commands::secret_get,
            features::workspace::commands::secret_delete,
            features::workspace::commands::secret_list,
            features::dataset::commands::images_list_by_project,
            features::dataset::commands::images_list_range,
            features::dataset::commands::images_get,
            features::dataset::commands::images_save,
            features::dataset::commands::images_delete,
            features::dataset::commands::dataset_export_yolo,
            features::dataset::commands::dataset_import_yolo,
            features::ai::commands::ai_models_list,
            features::ai::commands::ai_models_list_by_project,
            features::ai::commands::ai_models_save,
            features::ai::commands::ai_models_delete,
            features::ai::commands::ai_models_set_active,
            features::ai::commands::ai_models_import,
            features::ai::commands::ai_models_install,
            features::ai::commands::ai_models_catalog_releases,
            features::ai::commands::predictions_list_by_image,
            features::ai::commands::predictions_generate,
            features::ai::commands::pipeline_run,
            features::ai::commands::predictions_accept,
            features::ai::commands::predictions_reject,
            features::ai::commands::ai_model_registry,
            features::copilot::commands::ai_copilot_turn,
            features::copilot::commands::ai_copilot_apply_action,
            features::copilot::commands::ai_copilot_test_connection,
            features::analysis::commands::analysis_run,
            features::analysis::commands::analysis_job_status,
            features::analysis::commands::analysis_reports_list,
            features::analysis::commands::analysis_report_get,
            features::analysis::commands::analysis_report_latest,
            features::analysis::commands::analysis_report_delete,
            features::video::commands::video_ffmpeg_info,
            features::video::commands::video_import,
            features::video::commands::video_list,
            features::video::commands::video_get,
            features::video::commands::video_delete,
            features::video::commands::video_ingest,
            features::video::commands::video_job_status,
            features::video::commands::video_tracks_list,
            features::video::commands::video_track_save,
            features::video::commands::video_track_delete,
            features::video::commands::video_export_tracks,
            features::runtime::commands::runtime_start,
            features::runtime::commands::runtime_stop,
            features::runtime::commands::runtime_restart,
            features::runtime::commands::runtime_status,
            features::runtime::commands::runtime_logs,
            features::runtime::commands::runtime_system_info,
            features::runtime::commands::runtime_detect,
            features::runtime::commands::runtime_segment,
            features::runtime::commands::runtime_caption,
            features::runtime::commands::runtime_ocr,
            features::runtime::commands::runtime_models_list,
            features::runtime::commands::runtime_models_install,
            features::runtime::commands::runtime_models_delete,
            features::runtime::commands::runtime_gpu_probe,
            features::runtime::commands::runtime_enable_gpu,
            features::runtime::commands::app_restart,
            features::training::commands::training_start,
            features::training::commands::training_stop,
            features::training::commands::training_list,
            features::training::commands::training_sync,
            features::training::commands::training_logs,
            features::training::commands::training_report,
            features::training::commands::export_onnx,
            features::training::commands::export_tensorrt,
            features::training::commands::export_openvino,
            features::training::commands::training_export_onnx,
            features::cloud::commands::cloud_test_connection,
            features::cloud::commands::cloud_upload_files,
            features::cloud::commands::cloud_download_files,
            features::cloud::commands::cloud_delete_object,
            features::cloud::commands::cloud_list_objects,
            features::plugins::commands::plugins_list,
            features::system::commands::health,
            features::system::commands::system_info,
            features::system::commands::open_path_dialog,
            features::system::commands::open_external,
            features::system::commands::fs_ensure_directory,
            features::system::commands::fs_save_image,
            features::system::commands::fs_load_image,
            features::system::commands::fs_delete_image,
            features::system::commands::fs_list_images,
            features::system::commands::fs_get_base_name,
            features::system::commands::fs_write_text_file,
            features::system::commands::fs_read_text_file,
            features::system::commands::images_scan_directory,
            features::system::commands::allow_image_directory,
            features::system::commands::updater_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
