use crate::store::{EntityStore, StoreError};
use serde::{de::DeserializeOwned, Serialize};
use std::marker::PhantomData;
use std::sync::Arc;

pub trait CrudRepository<T>: Send + Sync {
    fn list(&self) -> Result<Vec<T>, StoreError>;
    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<T>, StoreError>;
    fn get(&self, id: &str) -> Result<Option<T>, StoreError>;
    fn create(&self, entity: &T) -> Result<T, StoreError>;
    fn update(&self, entity: &T) -> Result<T, StoreError>;
    fn delete(&self, id: &str) -> Result<(), StoreError>;
}

pub struct JsonCrudRepository<T> {
    store: Arc<dyn EntityStore>,
    kind: &'static str,
    _entity: PhantomData<T>,
}

impl<T> JsonCrudRepository<T>
where
    T: Serialize + DeserializeOwned,
{
    pub fn new(store: Arc<dyn EntityStore>, kind: &'static str) -> Self {
        Self {
            store,
            kind,
            _entity: PhantomData,
        }
    }

    fn parse_entity(value: serde_json::Value) -> Result<T, StoreError> {
        serde_json::from_value(value).map_err(StoreError::Json)
    }

    fn to_value(entity: &T) -> Result<serde_json::Value, StoreError> {
        serde_json::to_value(entity).map_err(StoreError::Json)
    }
}

impl<T> CrudRepository<T> for JsonCrudRepository<T>
where
    T: Serialize + DeserializeOwned + Send + Sync + 'static,
{
    fn list(&self) -> Result<Vec<T>, StoreError> {
        let values = self.store.list_entities(self.kind)?;
        values
            .into_iter()
            .map(Self::parse_entity)
            .collect::<Result<Vec<T>, StoreError>>()
    }

    fn list_by_field(&self, field: &str, value: &str) -> Result<Vec<T>, StoreError> {
        let values = self.store.list_by_field(self.kind, field, value)?;
        values
            .into_iter()
            .map(Self::parse_entity)
            .collect::<Result<Vec<T>, StoreError>>()
    }

    fn get(&self, id: &str) -> Result<Option<T>, StoreError> {
        self.store
            .get_entity(self.kind, id)?
            .map(Self::parse_entity)
            .transpose()
    }

    fn create(&self, entity: &T) -> Result<T, StoreError> {
        let saved = self
            .store
            .upsert_entity(self.kind, Self::to_value(entity)?)?;
        Self::parse_entity(saved)
    }

    fn update(&self, entity: &T) -> Result<T, StoreError> {
        let saved = self
            .store
            .upsert_entity(self.kind, Self::to_value(entity)?)?;
        Self::parse_entity(saved)
    }

    fn delete(&self, id: &str) -> Result<(), StoreError> {
        self.store.delete_entity(self.kind, id)
    }
}
