//! The Cloud Storage use-case service.

use std::sync::Arc;

use vailabel_core::DomainResult;

use crate::application::ports::ObjectStoreFactory;
use crate::contracts::{
    BatchResult, CloudBatchPayload, CloudConfigPayload, CloudListPayload, CloudObjectMeta,
    CloudObjectPayload, TestConnectionResult, TransferFailure,
};

/// Application service for cloud object-store sync.
///
/// Orchestrates the [`ObjectStoreFactory`] port injected by the composition
/// root, so it carries no OpenDAL/filesystem knowledge and is unit-testable with
/// an in-memory fake.
pub struct CloudStorageService {
    factory: Arc<dyn ObjectStoreFactory>,
}

impl CloudStorageService {
    /// Build the service from its injected object-store factory.
    pub fn new(factory: Arc<dyn ObjectStoreFactory>) -> Self {
        Self { factory }
    }

    /// Probe connectivity + credentials without raising — the UI shows the
    /// message verbatim.
    pub async fn test_connection(&self, payload: CloudConfigPayload) -> TestConnectionResult {
        match self.check(&payload).await {
            Ok(()) => TestConnectionResult {
                ok: true,
                message: "Connection successful".into(),
            },
            Err(error) => TestConnectionResult {
                ok: false,
                message: error.to_string(),
            },
        }
    }

    async fn check(&self, payload: &CloudConfigPayload) -> DomainResult<()> {
        let store = self
            .factory
            .connect(&payload.config_id, &payload.provider, &payload.config)?;
        store.check().await
    }

    /// Upload a batch. Never fail-fast: every item is attempted and
    /// successes/failures are reported separately.
    pub async fn upload_files(&self, payload: CloudBatchPayload) -> DomainResult<BatchResult> {
        let store = self
            .factory
            .connect(&payload.config_id, &payload.provider, &payload.config)?;
        let mut result = BatchResult::default();
        for item in &payload.items {
            // One image at a time: peak memory is a single file, not the batch.
            match store.upload(&item.key, &item.path).await {
                Ok(()) => result.succeeded.push(item.key.clone()),
                Err(error) => result.failed.push(TransferFailure {
                    key: item.key.clone(),
                    error: error.to_string(),
                }),
            }
        }
        Ok(result)
    }

    /// Download a batch, with the same never-fail-fast policy as upload.
    pub async fn download_files(&self, payload: CloudBatchPayload) -> DomainResult<BatchResult> {
        let store = self
            .factory
            .connect(&payload.config_id, &payload.provider, &payload.config)?;
        let mut result = BatchResult::default();
        for item in &payload.items {
            match store.download(&item.key, &item.path).await {
                Ok(()) => result.succeeded.push(item.key.clone()),
                Err(error) => result.failed.push(TransferFailure {
                    key: item.key.clone(),
                    error: error.to_string(),
                }),
            }
        }
        Ok(result)
    }

    /// Delete a single object.
    pub async fn delete_object(&self, payload: CloudObjectPayload) -> DomainResult<()> {
        let store = self
            .factory
            .connect(&payload.config_id, &payload.provider, &payload.config)?;
        store.delete(&payload.key).await
    }

    /// List objects under an optional prefix.
    pub async fn list_objects(
        &self,
        payload: CloudListPayload,
    ) -> DomainResult<Vec<CloudObjectMeta>> {
        let store = self
            .factory
            .connect(&payload.config_id, &payload.provider, &payload.config)?;
        let prefix = payload.prefix.clone().unwrap_or_default();
        store.list(&prefix, payload.limit).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::ObjectStore;
    use async_trait::async_trait;
    use serde_json::json;
    use vailabel_core::DomainError;

    /// A fake store that fails any key containing "boom", proving the batch
    /// aggregation (and that the service holds no real infrastructure).
    struct FakeStore;

    #[async_trait]
    impl ObjectStore for FakeStore {
        async fn check(&self) -> DomainResult<()> {
            Ok(())
        }
        async fn upload(&self, key: &str, _local_path: &str) -> DomainResult<()> {
            fail_if_boom(key)
        }
        async fn download(&self, key: &str, _local_path: &str) -> DomainResult<()> {
            fail_if_boom(key)
        }
        async fn delete(&self, key: &str) -> DomainResult<()> {
            fail_if_boom(key)
        }
        async fn list(
            &self,
            _prefix: &str,
            _limit: Option<usize>,
        ) -> DomainResult<Vec<CloudObjectMeta>> {
            Ok(Vec::new())
        }
    }

    fn fail_if_boom(key: &str) -> DomainResult<()> {
        if key.contains("boom") {
            Err(DomainError::repository("boom"))
        } else {
            Ok(())
        }
    }

    struct FakeFactory {
        connect_ok: bool,
    }

    impl ObjectStoreFactory for FakeFactory {
        fn connect(
            &self,
            _config_id: &str,
            _provider: &str,
            _config: &serde_json::Value,
        ) -> DomainResult<Box<dyn ObjectStore>> {
            if self.connect_ok {
                Ok(Box::new(FakeStore))
            } else {
                Err(DomainError::validation("Cloud config is missing 'bucket'"))
            }
        }
    }

    fn service(connect_ok: bool) -> CloudStorageService {
        CloudStorageService::new(Arc::new(FakeFactory { connect_ok }))
    }

    fn batch(keys: &[&str]) -> CloudBatchPayload {
        serde_json::from_value(json!({
            "configId": "cfg",
            "provider": "aws",
            "config": {},
            "items": keys
                .iter()
                .map(|k| json!({ "key": k, "path": "/tmp/x" }))
                .collect::<Vec<_>>(),
        }))
        .unwrap()
    }

    #[test]
    fn upload_reports_successes_and_failures_separately() {
        let result = tauri_block_on(service(true).upload_files(batch(&["a.jpg", "boom.jpg", "b.jpg"])))
            .unwrap();
        assert_eq!(result.succeeded, vec!["a.jpg", "b.jpg"]);
        assert_eq!(result.failed.len(), 1);
        assert_eq!(result.failed[0].key, "boom.jpg");
    }

    #[test]
    fn test_connection_never_raises() {
        let ok = tauri_block_on(service(true).test_connection(
            serde_json::from_value(json!({ "configId": "c", "provider": "aws", "config": {} }))
                .unwrap(),
        ));
        assert!(ok.ok);

        let bad = tauri_block_on(service(false).test_connection(
            serde_json::from_value(json!({ "configId": "c", "provider": "aws", "config": {} }))
                .unwrap(),
        ));
        assert!(!bad.ok);
        assert!(bad.message.contains("missing 'bucket'"));
    }

    /// Minimal block-on for the async use cases without pulling a runtime dep:
    /// the fakes never yield, so a no-op waker that polls once is sufficient.
    fn tauri_block_on<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        fn noop(_: *const ()) {}
        fn clone(_: *const ()) -> RawWaker {
            RawWaker::new(std::ptr::null(), &VTABLE)
        }
        static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, noop, noop, noop);
        let waker = unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
        let mut cx = Context::from_waker(&waker);
        // SAFETY: `fut` is owned and never moved after pinning here.
        let mut fut = unsafe { std::pin::Pin::new_unchecked(&mut fut) };
        loop {
            match fut.as_mut().poll(&mut cx) {
                Poll::Ready(value) => return value,
                Poll::Pending => continue,
            }
        }
    }
}
