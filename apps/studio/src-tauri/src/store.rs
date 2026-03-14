use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
  #[error(transparent)]
  Sql(#[from] rusqlite::Error),
  #[error(transparent)]
  Json(#[from] serde_json::Error),
}

pub struct DesktopStore {
  connection: Connection,
}

impl DesktopStore {
  pub fn open(path: PathBuf) -> Result<Self, StoreError> {
    let connection = Connection::open(path)?;
    let store = Self { connection };
    store.initialize()?;
    Ok(store)
  }

  fn initialize(&self) -> Result<(), StoreError> {
    self.connection.execute_batch(
      "
      CREATE TABLE IF NOT EXISTS entities (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        key_value TEXT,
        project_id TEXT,
        image_id TEXT,
        email TEXT,
        PRIMARY KEY(kind, id)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
      CREATE INDEX IF NOT EXISTS idx_entities_kind_project ON entities(kind, project_id);
      CREATE INDEX IF NOT EXISTS idx_entities_kind_image ON entities(kind, image_id);
      CREATE INDEX IF NOT EXISTS idx_entities_kind_key ON entities(kind, key_value);
      CREATE INDEX IF NOT EXISTS idx_entities_kind_email ON entities(kind, email);

      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS secret_keys (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        PRIMARY KEY(namespace, key)
      );
      ",
    )?;

    self.seed_defaults()?;
    Ok(())
  }

  fn entity_indexes(value: &Value) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
    let key_value = value
      .get("key")
      .and_then(Value::as_str)
      .map(ToString::to_string);
    let project_id = value
      .get("project_id")
      .or_else(|| value.get("projectId"))
      .and_then(Value::as_str)
      .map(ToString::to_string);
    let image_id = value
      .get("image_id")
      .or_else(|| value.get("imageId"))
      .and_then(Value::as_str)
      .map(ToString::to_string);
    let email = value
      .get("email")
      .and_then(Value::as_str)
      .map(ToString::to_string);

    (key_value, project_id, image_id, email)
  }

  fn seed_defaults(&self) -> Result<(), StoreError> {
    let has_users = self
      .connection
      .query_row(
        "SELECT COUNT(*) FROM entities WHERE kind = 'users'",
        [],
        |row| row.get::<_, i64>(0),
      )?
      > 0;

    if has_users {
      return Ok(());
    }

    let read_permission_id = Uuid::new_v4().to_string();
    let write_permission_id = Uuid::new_v4().to_string();
    let admin_role_id = Uuid::new_v4().to_string();
    let admin_user_id = Uuid::new_v4().to_string();

    self.upsert_entity(
      "permissions",
      json!({
        "id": read_permission_id,
        "name": "projects:read",
        "description": "Read projects",
        "resource": "projects",
        "action": "read"
      }),
    )?;
    self.upsert_entity(
      "permissions",
      json!({
        "id": write_permission_id,
        "name": "projects:write",
        "description": "Modify projects",
        "resource": "projects",
        "action": "write"
      }),
    )?;

    self.upsert_entity(
      "roles",
      json!({
        "id": admin_role_id,
        "name": "admin",
        "description": "Default administrator role",
        "permissions": [read_permission_id.clone(), write_permission_id.clone()]
      }),
    )?;

    self.upsert_entity(
      "users",
      json!({
        "id": admin_user_id,
        "email": "admin@vailabel.local",
        "name": "Admin User",
        "password": "admin123",
        "role": "admin",
        "roleId": admin_role_id,
        "roles": ["admin"],
        "permissions": ["projects:read", "projects:write"],
        "userPermissions": [
          {
            "id": read_permission_id,
            "name": "projects:read",
            "resource": "projects",
            "action": "read"
          },
          {
            "id": write_permission_id,
            "name": "projects:write",
            "resource": "projects",
            "action": "write"
          }
        ]
      }),
    )?;

    for (key, value) in [
      ("showRulers", "true"),
      ("showCrosshairs", "true"),
      ("showCoordinates", "true"),
      ("brightness", "100"),
      ("contrast", "100"),
      ("keyboardShortcuts", "[]"),
    ] {
      self.upsert_setting(json!({ "key": key, "value": value }))?;
    }

    Ok(())
  }

  pub fn upsert_entity(&self, kind: &str, value: Value) -> Result<Value, StoreError> {
    let id = value
      .get("id")
      .and_then(Value::as_str)
      .unwrap_or_default()
      .to_string();
    let data = serde_json::to_string(&value)?;
    let (key_value, project_id, image_id, email) = Self::entity_indexes(&value);

    self.connection.execute(
      "
      INSERT INTO entities (kind, id, data, key_value, project_id, image_id, email)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      ON CONFLICT(kind, id) DO UPDATE SET
        data = excluded.data,
        key_value = excluded.key_value,
        project_id = excluded.project_id,
        image_id = excluded.image_id,
        email = excluded.email
      ",
      params![kind, id, data, key_value, project_id, image_id, email],
    )?;

    Ok(value)
  }

  pub fn get_entity(&self, kind: &str, id: &str) -> Result<Option<Value>, StoreError> {
    let row = self
      .connection
      .query_row(
        "SELECT data FROM entities WHERE kind = ?1 AND id = ?2",
        params![kind, id],
        |row| row.get::<_, String>(0),
      )
      .optional()?;

    row
      .map(|data| serde_json::from_str::<Value>(&data))
      .transpose()
      .map_err(StoreError::from)
  }

  pub fn list_entities(&self, kind: &str) -> Result<Vec<Value>, StoreError> {
    let mut statement = self
      .connection
      .prepare("SELECT data FROM entities WHERE kind = ?1 ORDER BY rowid DESC")?;
    let rows = statement.query_map(params![kind], |row| row.get::<_, String>(0))?;

    rows
      .map(|row| Ok(serde_json::from_str::<Value>(&row?)?))
      .collect()
  }

  pub fn list_by_field(&self, kind: &str, field: &str, value: &str) -> Result<Vec<Value>, StoreError> {
    let sql = match field {
      "project_id" => {
        "SELECT data FROM entities WHERE kind = ?1 AND project_id = ?2 ORDER BY rowid DESC"
      }
      "image_id" => {
        "SELECT data FROM entities WHERE kind = ?1 AND image_id = ?2 ORDER BY rowid DESC"
      }
      "key" => {
        "SELECT data FROM entities WHERE kind = ?1 AND key_value = ?2 ORDER BY rowid DESC"
      }
      "email" => {
        "SELECT data FROM entities WHERE kind = ?1 AND email = ?2 ORDER BY rowid DESC"
      }
      _ => "SELECT data FROM entities WHERE kind = ?1 ORDER BY rowid DESC",
    };
    let mut statement = self.connection.prepare(sql)?;
    let rows = statement.query_map(params![kind, value], |row| row.get::<_, String>(0))?;

    rows
      .map(|row| Ok(serde_json::from_str::<Value>(&row?)?))
      .collect()
  }

  pub fn delete_entity(&self, kind: &str, id: &str) -> Result<(), StoreError> {
    self
      .connection
      .execute("DELETE FROM entities WHERE kind = ?1 AND id = ?2", params![kind, id])?;
    Ok(())
  }

  pub fn get_setting(&self, key: &str) -> Result<Option<Value>, StoreError> {
    let row = self
      .connection
      .query_row(
        "SELECT data FROM entities WHERE kind = 'settings' AND key_value = ?1",
        params![key],
        |row| row.get::<_, String>(0),
      )
      .optional()?;

    row
      .map(|data| serde_json::from_str::<Value>(&data))
      .transpose()
      .map_err(StoreError::from)
  }

  pub fn upsert_setting(&self, value: Value) -> Result<Value, StoreError> {
    let key = value.get("key").and_then(Value::as_str).unwrap_or_default();
    let id = self
      .get_setting(key)?
      .and_then(|setting| setting.get("id").and_then(Value::as_str).map(ToString::to_string))
      .unwrap_or_else(|| Uuid::new_v4().to_string());

    let setting = json!({
      "id": id,
      "key": key,
      "value": value.get("value").cloned().unwrap_or_else(|| Value::String(String::new())),
      "createdAt": value
        .get("createdAt")
        .cloned()
        .unwrap_or_else(|| Value::String(chrono::Utc::now().to_rfc3339())),
      "updatedAt": Value::String(chrono::Utc::now().to_rfc3339())
    });

    self.upsert_entity("settings", setting.clone())?;
    Ok(setting)
  }

  pub fn find_user_by_credentials(
    &self,
    email: &str,
    password: &str,
  ) -> Result<Option<Value>, StoreError> {
    let users = self.list_by_field("users", "email", email)?;
    Ok(users.into_iter().find(|user| {
      user.get("password").and_then(Value::as_str).unwrap_or_default() == password
    }))
  }

  pub fn issue_token(&self, user_id: &str) -> Result<String, StoreError> {
    let token = Uuid::new_v4().to_string();
    self.connection.execute(
      "INSERT INTO auth_tokens (token, user_id) VALUES (?1, ?2)",
      params![token, user_id],
    )?;
    Ok(token)
  }

  pub fn resolve_token(&self, token: &str) -> Result<Option<String>, StoreError> {
    self
      .connection
      .query_row(
        "SELECT user_id FROM auth_tokens WHERE token = ?1",
        params![token],
        |row| row.get::<_, String>(0),
      )
      .optional()
      .map_err(StoreError::from)
  }

  pub fn revoke_token(&self, token: &str) -> Result<(), StoreError> {
    self
      .connection
      .execute("DELETE FROM auth_tokens WHERE token = ?1", params![token])?;
    Ok(())
  }

  pub fn list_secret_keys(&self, namespace: &str) -> Result<Vec<String>, StoreError> {
    let mut statement = self
      .connection
      .prepare("SELECT key FROM secret_keys WHERE namespace = ?1 ORDER BY key ASC")?;
    let rows = statement.query_map(params![namespace], |row| row.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(StoreError::from)
  }

  pub fn register_secret_key(&self, namespace: &str, key: &str) -> Result<(), StoreError> {
    self.connection.execute(
      "INSERT OR IGNORE INTO secret_keys (namespace, key) VALUES (?1, ?2)",
      params![namespace, key],
    )?;
    Ok(())
  }

  pub fn unregister_secret_key(&self, namespace: &str, key: &str) -> Result<(), StoreError> {
    self.connection.execute(
      "DELETE FROM secret_keys WHERE namespace = ?1 AND key = ?2",
      params![namespace, key],
    )?;
    Ok(())
  }
}
