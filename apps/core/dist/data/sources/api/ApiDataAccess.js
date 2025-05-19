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
exports.ApiDataAccess = void 0;
const ApiClient_1 = require("@vailabel/core/src/data/sources/api/ApiClient");
class ApiDataAccess {
    constructor(apiClient) {
        this.api = apiClient !== null && apiClient !== void 0 ? apiClient : new ApiClient_1.ApiClient();
    }
    getSetting(key) {
        return this.api.get(`/settings/${key}`);
    }
    getAvailableModels() {
        return this.api.get("/models");
    }
    uploadCustomModel(file) {
        return this.api.post("/models", file);
    }
    selectModel(modelId) {
        return this.api.post(`/models/${modelId}/select`, {});
    }
    getSelectedModel() {
        return this.api.get("/models/selected");
    }
    deleteModel(modelId) {
        return this.api.delete(`/models/${modelId}`);
    }
    getProjectWithImages(id) {
        return this.api.get(`/projects/${id}`);
    }
    getNextImageId(currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/images/${currentImageId}/next`);
        });
    }
    getPreviousImageId(currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/images/${currentImageId}/previous`);
        });
    }
    deleteLabel(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.delete(`/labels/${id}`);
        });
    }
    getProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get("/projects");
        });
    }
    getProjectById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/projects/${id}`);
        });
    }
    getImages(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/projects/${projectId}/images`);
        });
    }
    getAnnotations(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/images/${imageId}/annotations`);
        });
    }
    createProject(project) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.post("/projects", project);
        });
    }
    updateProject(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put(`/projects/${id}`, updates);
        });
    }
    deleteProject(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.delete(`/projects/${id}`);
        });
    }
    createImage(image) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.post("/images", image);
        });
    }
    updateImage(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put(`/images/${id}`, updates);
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.delete(`/images/${id}`);
        });
    }
    createAnnotation(annotation) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.post("/annotations", annotation);
        });
    }
    updateAnnotation(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put(`/annotations/${id}`, updates);
        });
    }
    deleteAnnotation(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.delete(`/annotations/${id}`);
        });
    }
    getSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get("/settings");
        });
    }
    updateSetting(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put(`/settings/${key}`, { value });
        });
    }
    getHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get("/history");
        });
    }
    updateHistory(history) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put("/history", history);
        });
    }
    getImagesWithPagination(projectId, offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/projects/${projectId}/images?offset=${offset}&limit=${limit}`);
        });
    }
    getAnnotationsWithFilter(imageId, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = new URLSearchParams(filter).toString();
            return this.api.get(`/images/${imageId}/annotations?${query}`);
        });
    }
    createLabel(label, annotationIds) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.post("/labels", label);
            for (const annotationId of annotationIds) {
                yield this.api.put(`/annotations/${annotationId}`, { labelId: label.id });
            }
        });
    }
    getLabels() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get("/labels");
        });
    }
    getLabelById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.api.get(`/labels/${id}`);
        });
    }
    updateLabel(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.api.put(`/labels/${id}`, updates);
        });
    }
}
exports.ApiDataAccess = ApiDataAccess;
