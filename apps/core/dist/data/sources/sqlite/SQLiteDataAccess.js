"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDataAccess = void 0;
class SQLiteDataAccess {
    getAvailableModels() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = (yield window.ipc.invoke("sqlite:all", [
                "SELECT * FROM ai_models",
                [],
            ])) || [];
            if (!Array.isArray(rows)) {
                console.error("Expected array from sqlite:all, got:", rows);
                return [];
            }
            return rows.map((row) => ({
                id: row.id,
                name: row.name,
                description: row.description,
                version: row.version,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                modelPath: row.modelPath,
                configPath: row.configPath,
                modelSize: row.modelSize,
                isCustom: !!row.isCustom,
            }));
        });
    }
    uploadCustomModel(model) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Uploading custom model:", model);
            yield window.ipc.invoke("sqlite:run", [
                `INSERT OR REPLACE INTO ai_models (id, name, description, version, createdAt, updatedAt, modelPath, configPath, modelSize, isCustom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    model.id,
                    model.name,
                    model.description,
                    model.version,
                    model.createdAt.toISOString(),
                    model.updatedAt.toISOString(),
                    model.modelPath,
                    model.configPath,
                    model.modelSize,
                    model.isCustom ? 1 : 0,
                ],
            ]);
        });
    }
    selectModel(modelId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("sqlite:run", [
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                ["selectedModelId", modelId],
            ]);
        });
    }
    getSelectedModel() {
        return __awaiter(this, void 0, void 0, function* () {
            const row = (yield window.ipc.invoke("sqlite:get", [
                "SELECT value FROM settings WHERE key = ?",
                ["selectedModelId"],
            ]));
            if (!(row === null || row === void 0 ? void 0 : row.value))
                return undefined;
            const model = yield window.ipc.invoke("sqlite:get", [
                "SELECT * FROM ai_models WHERE id = ?",
                [row.value],
            ]);
            if (!model)
                return undefined;
            return {
                id: model.id,
                name: model.name,
                description: model.description,
                version: model.version,
                createdAt: new Date(model.createdAt),
                updatedAt: new Date(model.updatedAt),
                modelPath: model.modelPath,
                configPath: model.configPath,
                modelSize: model.modelSize,
                isCustom: !!model.isCustom,
            };
        });
    }
    deleteModel(modelId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("sqlite:run", [
                "DELETE FROM ai_models WHERE id = ?",
                [modelId],
            ]);
            const selected = (yield window.ipc.invoke("sqlite:get", [
                "SELECT value FROM settings WHERE key = ?",
                ["selectedModelId"],
            ]));
            if ((selected === null || selected === void 0 ? void 0 : selected.value) === modelId) {
                yield window.ipc.invoke("sqlite:run", [
                    "DELETE FROM settings WHERE key = ?",
                    ["selectedModelId"],
                ]);
            }
        });
    }
    getProjectWithImages(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const project = (yield window.ipc.invoke("sqlite:get", [
                "SELECT * FROM projects WHERE id = ?",
                [id],
            ]));
            if (!project)
                return undefined;
            const images = (yield window.ipc.invoke("sqlite:all", [
                "SELECT * FROM images WHERE projectId = ?",
                [id],
            ]));
            return Object.assign(Object.assign({}, project), { images });
        });
    }
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
        return __awaiter(this, void 0, void 0, function* () {
            // Delete annotations for all images in the project
            const images = yield window.ipc.invoke("sqlite:all", [
                "SELECT id FROM images WHERE projectId = ?",
                [id],
            ]);
            const imageIds = images.map((img) => img.id);
            if (imageIds.length > 0) {
                // Delete annotations for these images
                yield window.ipc.invoke("sqlite:run", [
                    `DELETE FROM annotations WHERE imageId IN (${imageIds.map(() => "?").join(",")})`,
                    imageIds,
                ]);
            }
            // Delete images for the project
            yield window.ipc.invoke("sqlite:run", [
                "DELETE FROM images WHERE projectId = ?",
                [id],
            ]);
            // Delete labels for the project
            yield window.ipc.invoke("sqlite:run", [
                "DELETE FROM labels WHERE projectId = ?",
                [id],
            ]);
            // Delete the project itself
            yield window.ipc.invoke("sqlite:run", [
                "DELETE FROM projects WHERE id = ?",
                [id],
            ]);
        });
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
            "INSERT INTO images (id, projectId, name, data, width, height, url, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                image.id,
                image.projectId,
                image.name,
                image.data,
                image.width,
                image.height,
                image.url,
                image.createdAt,
            ],
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
        const result = window.ipc.invoke("sqlite:all", [
            "SELECT * FROM annotations WHERE imageId = ?",
            [imageId],
        ]);
        result.then((rows) => {
            rows.forEach((row) => {
                if (row.coordinates && typeof row.coordinates === "string") {
                    try {
                        row.coordinates = JSON.parse(row.coordinates);
                    }
                    catch (e) {
                        console.error("Failed to parse coordinates:", e);
                    }
                }
            });
        });
        return result;
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
            "INSERT INTO annotations (id, imageId, labelId, name, type, coordinates, color, isAIGenerated, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                annotation.id,
                annotation.imageId,
                annotation.labelId,
                annotation.name,
                annotation.type,
                JSON.stringify(annotation.coordinates),
                annotation.color,
                annotation.isAIGenerated,
                annotation.createdAt,
                annotation.updatedAt,
            ],
        ]);
    }
    updateAnnotation(id, updates) {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.keys(updates).map((key) => key === "coordinates" && updates.coordinates !== undefined
            ? JSON.stringify(updates.coordinates)
            : updates[key]);
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
            "INSERT INTO labels (id, name, category, isAIGenerated, projectId, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                label.id,
                label.name,
                label.category,
                label.isAIGenerated,
                label.projectId,
                label.color,
                label.createdAt,
                label.updatedAt,
            ],
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
    getSetting(key) {
        return window.ipc.invoke("sqlite:get", [
            "SELECT * FROM settings WHERE key = ?",
            [key],
        ]);
    }
    updateSetting(key, value) {
        return window.ipc.invoke("sqlite:run", [
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            [key, value],
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
