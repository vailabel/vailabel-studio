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
exports.FileSystemStorageAdapter = void 0;
class FileSystemStorageAdapter {
    constructor(directory) {
        this.directory = directory;
    }
    getPath(id) {
        return window.ipc.invoke("fs-get-path", { directory: this.directory });
    }
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("fs-save-image", { path: this.getPath(id), data });
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("fs-load-image", { path: this.getPath(id) });
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("fs-delete-image", { path: this.getPath(id) });
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield window.ipc.invoke("fs-list-images", {
                directory: this.directory,
            });
            return files
                .filter((f) => f.endsWith(".png"))
                .map((f) => window.ipc.invoke("fs-get-base-name", { file: f }));
        });
    }
}
exports.FileSystemStorageAdapter = FileSystemStorageAdapter;
