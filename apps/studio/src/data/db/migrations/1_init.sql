CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT,
  lastModified TEXT
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  name TEXT,
  data TEXT,
  width INTEGER,
  height INTEGER,
  createdAt TEXT,
  FOREIGN KEY(projectId) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  imageId TEXT,
  labelId TEXT,
  type TEXT,
  coordinates TEXT,
  color TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY(imageId) REFERENCES images(id),
  FOREIGN KEY(labelId) REFERENCES labels(id)
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotationId TEXT,
  action TEXT,
  timestamp TEXT,
  data TEXT,
  FOREIGN KEY(annotationId) REFERENCES annotations(id)
);
