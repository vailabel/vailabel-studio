CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt DATETIME,
  lastModified DATETIME
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  name TEXT,
  data TEXT,
  width INTEGER,
  height INTEGER,
  url TEXT,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  isAIGenerated BOOLEAN,
  projectId TEXT,
  color TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  imageId TEXT,
  labelId TEXT,
  name TEXT,
  type TEXT,
  coordinates JSON,
  color TEXT,
  isAIGenerated BOOLEAN,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY(imageId) REFERENCES images(id) ON DELETE CASCADE,
  FOREIGN KEY(labelId) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  labels TEXT,
  historyIndex INTEGER,
  canUndo BOOLEAN,
  canRedo BOOLEAN
);

CREATE TABLE IF NOT EXISTS export_formats (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  extension TEXT
);

CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  isCustom BOOLEAN
);
