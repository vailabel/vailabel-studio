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
exports.ImageDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class ImageDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("images");
    }
    getImageWithAnnotations(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch the image data
            const image = yield window.ipc.invoke("sqlite:get", [
                `SELECT * FROM ${this.table} WHERE id = ?`,
                [imageId],
            ]);
            if (!image)
                return null;
            // Fetch all annotations for this image
            const annotations = yield window.ipc.invoke("sqlite:all", [
                `SELECT * FROM annotations WHERE imageId = ?`,
                [imageId],
            ]);
            return Object.assign(Object.assign({}, image), { annotations: Array.isArray(annotations)
                    ? annotations.map((a) => (Object.assign(Object.assign({}, a), { coordinates: a.coordinates ? JSON.parse(a.coordinates) : undefined })))
                    : [] });
        });
    }
    getNext(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield window.ipc.invoke("sqlite:get", [
                `SELECT id FROM ${this.table} WHERE projectId = ? AND id > ? ORDER BY id ASC LIMIT 1`,
                [projectId, currentImageId],
            ]);
            const hasNextResult = yield window.ipc.invoke("sqlite:get", [
                `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ? AND id > ?`,
                [projectId, (_a = result === null || result === void 0 ? void 0 : result.id) !== null && _a !== void 0 ? _a : currentImageId],
            ]);
            return {
                id: result === null || result === void 0 ? void 0 : result.id,
                hasNext: hasNextResult.count > 0,
            };
        });
    }
    getPrevious(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield window.ipc.invoke("sqlite:get", [
                `SELECT id FROM ${this.table} WHERE projectId = ? AND id < ? ORDER BY id DESC LIMIT 1`,
                [projectId, currentImageId],
            ]);
            const hasPrevResult = yield window.ipc.invoke("sqlite:get", [
                `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ? AND id < ?`,
                [projectId, (_a = result === null || result === void 0 ? void 0 : result.id) !== null && _a !== void 0 ? _a : currentImageId],
            ]);
            return {
                id: result === null || result === void 0 ? void 0 : result.id,
                hasPrevious: hasPrevResult.count > 0,
            };
        });
    }
    getByProjectId(projectId) {
        return window.ipc.invoke("sqlite:all", [
            `SELECT * FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
    }
    countByProjectId(projectId) {
        const result = window.ipc.invoke("sqlite:get", [
            `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
        return result.then((data) => data.count);
    }
}
exports.ImageDataAccess = ImageDataAccess;
