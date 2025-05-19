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
        this.saveImage = (id, data) => __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("fs-save-image", { path: this.getPath(id), data });
        });
        this.loadImage = (id) => __awaiter(this, void 0, void 0, function* () {
            return (yield window.ipc.invoke("fs-load-image", {
                path: this.getPath(id),
            }));
        });
        this.deleteImage = (id) => __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("fs-delete-image", { path: this.getPath(id) });
        });
        this.listImages = () => __awaiter(this, void 0, void 0, function* () {
            const files = (yield window.ipc.invoke("fs-list-images", {
                directory: this.directory,
            }));
            const baseNames = yield Promise.all(files
                .filter((f) => f.endsWith(".png"))
                .map((f) => window.ipc.invoke("fs-get-base-name", {
                file: f,
            })));
            return baseNames;
        });
        if (!directory) {
            throw new Error("Directory is required");
        }
        this.directory = directory;
        // Ensure the directory exists
        window.ipc.invoke("fs-ensure-directory", { path: this.directory });
    }
    getPath(id) {
        return `${this.directory}/${id}`;
    }
}
exports.FileSystemStorageAdapter = FileSystemStorageAdapter;
