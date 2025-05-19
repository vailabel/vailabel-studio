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
        this.uploadModel = (file) => __awaiter(this, void 0, void 0, function* () {
            console.log("Uploading model to filesystem", file);
            yield this.ensureDirectory();
            const modelPath = this.getPath(file.name);
            const fileWithPath = file;
            let uploadArgs = {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                filePath: modelPath,
                destinationPath: modelPath,
            };
            if (fileWithPath.path) {
                uploadArgs.sourcePath = fileWithPath.path;
            }
            else {
                // Fallback for browser File: read as buffer
                const buffer = yield file.arrayBuffer();
                uploadArgs.data = Buffer.from(buffer);
            }
            yield window.ipc.invoke("fs-upload-model", uploadArgs);
            return {
                id: file.name,
                name: file.name,
                description: "",
                version: "1.0.0",
                createdAt: new Date(),
                updatedAt: new Date(),
                modelPath,
                configPath: "",
                modelSize: file.size,
                isCustom: true,
            };
        });
        this.ensureDirectory = () => __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("fs-ensure-directory", { path: this.directory });
        });
        this.saveImage = (id, data) => __awaiter(this, void 0, void 0, function* () {
            yield this.ensureDirectory();
            yield window.ipc.invoke("fs-save-image", { path: this.getPath(id), data });
        });
        this.loadImage = (id) => __awaiter(this, void 0, void 0, function* () {
            yield this.ensureDirectory();
            return (yield window.ipc.invoke("fs-load-image", {
                path: this.getPath(id),
            }));
        });
        this.deleteImage = (id) => __awaiter(this, void 0, void 0, function* () {
            yield this.ensureDirectory();
            yield window.ipc.invoke("fs-delete-image", { path: this.getPath(id) });
        });
        this.listImages = () => __awaiter(this, void 0, void 0, function* () {
            yield this.ensureDirectory();
            const files = (yield window.ipc.invoke("fs-list-images", {
                directory: this.directory,
            }));
            // Only return image files (png, jpg, jpeg, gif, bmp, webp, tiff, svg)
            const imageExtensions = [
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".bmp",
                ".webp",
                ".tiff",
                ".svg",
            ];
            const imageFiles = files.filter((f) => imageExtensions.some((ext) => f.toLowerCase().endsWith(ext)));
            const baseNames = yield Promise.all(imageFiles.map((f) => window.ipc.invoke("fs-get-base-name", {
                file: f,
            })));
            return baseNames;
        });
        if (!directory) {
            throw new Error("Directory is required");
        }
    }
    getPath(id) {
        return `${this.directory}/${id}`;
    }
}
exports.FileSystemStorageAdapter = FileSystemStorageAdapter;
