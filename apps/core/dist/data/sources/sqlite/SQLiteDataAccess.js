"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDataAccess = void 0;
class SQLiteDataAccess {
    getProjectById(id) {
        return window.ipc.invoke("sqlite:get", [
            "SELECT * FROM projects WHERE id = ?",
            [id],
        ]);
    }
    createProject(project) {
        return window.ipc.invoke("sqlite:run", [
            "INSERT INTO projects (id, name, createdAt, lastModified) VALUES (?, ?, ?, ?)",
            [project.id, project.name, project.createdAt, project.lastModified],
        ]);
    }
    updateProject(id, updates) {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(updates);
        return window.ipc.invoke("sqlite:run", [
            `UPDATE projects SET ${setClause} WHERE id = ?`,
            [...values, id],
        ]);
    }
    deleteProject(id) {
        return window.ipc.invoke("sqlite:run", [
            "DELETE FROM projects WHERE id = ?",
            [id],
        ]);
    }
    getImages(projectId) {
        return window.ipc.invoke("sqlite:all", [
            "SELECT * FROM images WHERE projectId = ?",
            [projectId],
        ]);
    }
    getImagesWithPagination(projectId, offset, limit) {
        return window.ipc.invoke("sqlite:all", [
            "SELECT * FROM images WHERE projectId = ? LIMIT ? OFFSET ?",
            [projectId, limit, offset],
        ]);
    }
    getNextImageId(currentImageId) {
        return window.ipc
            .invoke("sqlite:get", [
            "SELECT id FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
            [currentImageId],
        ])
            .then((row) => (row ? row.id : null));
    }
    getPreviousImageId(currentImageId) {
        return window.ipc
            .invoke("sqlite:get", [
            "SELECT id FROM images WHERE id < ? ORDER BY id DESC LIMIT 1",
            [currentImageId],
        ])
            .then((row) => (row ? row.id : null));
    }
    createImage(image) {
        return window.ipc.invoke("sqlite:run", [
            "INSERT INTO images (id, projectId, url, createdAt) VALUES (?, ?, ?, ?)",
            [image.id, image.projectId, image.url, image.createdAt],
        ]);
    }
    updateImage(id, updates) {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(updates);
        return window.ipc.invoke("sqlite:run", [
            `UPDATE images SET ${setClause} WHERE id = ?`,
            [...values, id],
        ]);
    }
    deleteImage(id) {
        return window.ipc.invoke("sqlite:run", [
            "DELETE FROM images WHERE id = ?",
            [id],
        ]);
    }
    getAnnotations(imageId) {
        return window.ipc.invoke("sqlite:all", [
            "SELECT * FROM annotations WHERE imageId = ?",
            [imageId],
        ]);
    }
    getAnnotationsWithFilter(imageId, filter) {
        const whereClause = Object.keys(filter)
            .map((key) => `${key} = ?`)
            .join(" AND ");
        const values = Object.values(filter);
        return window.ipc.invoke("sqlite:all", [
            `SELECT * FROM annotations WHERE imageId = ? AND ${whereClause}`,
            [imageId, ...values],
        ]);
    }
    createAnnotation(annotation) {
        return window.ipc.invoke("sqlite:run", [
            "INSERT INTO annotations (id, imageId, createdAt, updatedAt, coordinates) VALUES (?, ?, ?, ?, ?)",
            [
                annotation.id,
                annotation.imageId,
                annotation.createdAt,
                annotation.updatedAt,
                annotation.coordinates,
            ],
        ]);
    }
    updateAnnotation(id, updates) {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(updates);
        return window.ipc.invoke("sqlite:run", [
            `UPDATE annotations SET ${setClause} WHERE id = ?`,
            [...values, id],
        ]);
    }
    deleteAnnotation(id) {
        return window.ipc.invoke("sqlite:run", [
            "DELETE FROM annotations WHERE id = ?",
            [id],
        ]);
    }
    createLabel(label) {
        return window.ipc.invoke("sqlite:run", [
            "INSERT INTO labels (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
            [label.id, label.name, label.createdAt, label.updatedAt],
        ]);
    }
    getLabels() {
        return window.ipc.invoke("sqlite:all", ["SELECT * FROM labels", []]);
    }
    getLabelById(id) {
        return window.ipc.invoke("sqlite:get", [
            "SELECT * FROM labels WHERE id = ?",
            [id],
        ]);
    }
    updateLabel(id, updates) {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(updates);
        return window.ipc.invoke("sqlite:run", [
            `UPDATE labels SET ${setClause} WHERE id = ?`,
            [...values, id],
        ]);
    }
    deleteLabel(id) {
        return window.ipc.invoke("sqlite:run", [
            "DELETE FROM labels WHERE id = ?",
            [id],
        ]);
    }
    getSettings() {
        return window.ipc.invoke("sqlite:all", ["SELECT * FROM settings", []]);
    }
    updateSetting(key, value) {
        return window.ipc.invoke("sqlite:run", [
            "UPDATE settings SET value = ? WHERE key = ?",
            [value, key],
        ]);
    }
    getHistory() {
        return window.ipc.invoke("sqlite:all", ["SELECT * FROM history", []]);
    }
    updateHistory(history) {
        const setClause = Object.keys(history)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(history);
        return window.ipc.invoke("sqlite:run", [
            `UPDATE history SET ${setClause} WHERE id = ?`,
            [...values, history.id],
        ]);
    }
    getProjects() {
        return window.ipc.invoke("sqlite:all", ["SELECT * FROM projects", []]);
    }
}
exports.SQLiteDataAccess = SQLiteDataAccess;
