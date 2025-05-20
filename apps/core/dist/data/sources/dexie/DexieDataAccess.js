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
exports.DexieDataAccess = void 0;
const dexieDb_1 = require("@vailabel/core/src/data/db/dexieDb");
class DexieDataAccess {
    getAnnotationsByImageId(imageId) {
        throw new Error("Method not implemented.");
    }
    getSetting(key) {
        return dexieDb_1.db.settings.get(key);
    }
    getAvailableModels() {
        return dexieDb_1.db.aiModels.toArray();
    }
    uploadCustomModel(model) {
        return dexieDb_1.db.aiModels.add(model);
    }
    selectModel(modelId) {
        return dexieDb_1.db.settings.put({ key: "selectedModel", value: modelId });
    }
    getSelectedModel() {
        return dexieDb_1.db.settings.get("selectedModel").then((setting) => {
            if (!setting)
                return undefined;
            return dexieDb_1.db.aiModels.get(setting.value);
        });
    }
    deleteModel(modelId) {
        return dexieDb_1.db.aiModels.delete(modelId);
    }
    getProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.projects.toArray();
        });
    }
    getProjectById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.projects.get(id);
        });
    }
    getProjectWithImages(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const project = yield dexieDb_1.db.projects.get(id);
            if (project) {
                project.images = yield dexieDb_1.db.images.where("projectId").equals(id).toArray();
            }
            return project;
        });
    }
    getImages(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.images.where("projectId").equals(projectId).toArray();
        });
    }
    getAnnotations(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.annotations.where("imageId").equals(imageId).toArray();
        });
    }
    // Add methods for creating, updating, and deleting records
    createProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.projects.add(project);
        });
    }
    updateProject(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.projects.update(id, updates);
        });
    }
    deleteProject(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.projects.delete(id);
        });
    }
    createImage(image) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.images.add(image);
        });
    }
    updateImage(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.images.update(id, updates);
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.images.delete(id);
        });
    }
    createAnnotation(annotation) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.annotations.add(annotation);
        });
    }
    updateAnnotation(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.annotations.update(id, updates);
        });
    }
    deleteAnnotation(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.annotations.delete(id);
        });
    }
    // Add methods for settings and history management
    getSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.settings.toArray();
        });
    }
    updateSetting(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.settings.put({ key, value });
        });
    }
    getHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.history.toArray();
        });
    }
    updateHistory(history) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.history.put(history);
        });
    }
    // Add pagination and filtering support
    getImagesWithPagination(projectId, offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.images
                .where("projectId")
                .equals(projectId)
                .offset(offset)
                .limit(limit)
                .toArray();
        });
    }
    getAnnotationsWithFilter(imageId, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = dexieDb_1.db.annotations.where("imageId").equals(imageId);
            for (const [key, value] of Object.entries(filter)) {
                query = query.filter((item) => item[key] === value);
            }
            return query.toArray();
        });
    }
    createLabel(label, annotationIds) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add the label to the labels table
            yield dexieDb_1.db.labels.add(label);
            // Update the annotations to associate them with the label
            for (const annotationId of annotationIds) {
                yield dexieDb_1.db.annotations.update(annotationId, { labelId: label.id });
            }
        });
    }
    getLabels() {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.labels.toArray();
        });
    }
    getLabelById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return dexieDb_1.db.labels.get(id);
        });
    }
    updateLabel(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.labels.update(id, updates);
        });
    }
    deleteLabel(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dexieDb_1.db.labels.delete(id);
        });
    }
    // Implement getNextImageId
    getNextImageId(currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentImage = yield dexieDb_1.db.images.get(currentImageId);
            if (!currentImage)
                return null;
            const nextImage = yield dexieDb_1.db.images
                .where("projectId")
                .equals(currentImage.projectId)
                .and((img) => img.id > currentImageId)
                .first();
            return nextImage ? nextImage.id : null;
        });
    }
    // Implement getPreviousImageId
    getPreviousImageId(currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentImage = yield dexieDb_1.db.images.get(currentImageId);
            if (!currentImage)
                return null;
            const prevImage = yield dexieDb_1.db.images
                .where("projectId")
                .equals(currentImage.projectId)
                .and((img) => img.id < currentImageId)
                .last();
            return prevImage ? prevImage.id : null;
        });
    }
}
exports.DexieDataAccess = DexieDataAccess;
