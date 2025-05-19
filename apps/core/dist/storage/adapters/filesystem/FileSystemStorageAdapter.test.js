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
const globals_1 = require("@jest/globals");
const FileSystemStorageAdapter_1 = require("./FileSystemStorageAdapter");
// Arrange: mock window.ipc.invoke
globalThis.window = Object.create(window);
window.ipc = {
    invoke: globals_1.jest.fn(),
};
(0, globals_1.describe)("FileSystemStorageAdapter", () => {
    const directory = "/mock/dir";
    let adapter;
    (0, globals_1.beforeEach)(() => {
        ;
        window.ipc.invoke.mockClear();
        window.ipc.invoke.mockImplementation((...args) => {
            const channel = args[0];
            if (channel === "fs-load-image")
                return Promise.resolve(Buffer.from("mock"));
            if (channel === "fs-list-images")
                return Promise.resolve(["a.png", "b.png"]);
            if (channel === "fs-get-base-name")
                return Promise.resolve("a");
            return Promise.resolve();
        });
        adapter = new FileSystemStorageAdapter_1.FileSystemStorageAdapter(directory);
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(FileSystemStorageAdapter_1.FileSystemStorageAdapter).toBeDefined();
    });
    (0, globals_1.it)("should throw if directory is not provided", () => {
        (0, globals_1.expect)(() => new FileSystemStorageAdapter_1.FileSystemStorageAdapter("")).toThrow("Directory is required");
    });
    (0, globals_1.it)("should ensure directory exists on construction", () => {
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-ensure-directory", {
            path: directory,
        });
    });
    (0, globals_1.it)("should save image via IPC", () => __awaiter(void 0, void 0, void 0, function* () {
        yield adapter.saveImage("img1", Buffer.from("data"));
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-save-image", {
            path: `${directory}/img1`,
            data: Buffer.from("data"),
        });
    }));
    (0, globals_1.it)("should load image via IPC", () => __awaiter(void 0, void 0, void 0, function* () {
        const mockBuffer = Buffer.from("imgdata");
        window.ipc.invoke.mockResolvedValueOnce(mockBuffer);
        const result = yield adapter.loadImage("img2");
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-load-image", {
            path: `${directory}/img2`,
        });
        (0, globals_1.expect)(result).toBe(mockBuffer);
    }));
    (0, globals_1.it)("should delete image via IPC", () => __awaiter(void 0, void 0, void 0, function* () {
        yield adapter.deleteImage("img3");
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-delete-image", {
            path: `${directory}/img3`,
        });
    }));
    (0, globals_1.it)("should list images and return base names", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        window.ipc.invoke
            .mockResolvedValueOnce(["a.png", "b.txt", "c.png"]) // fs-list-images
            .mockResolvedValueOnce("a") // fs-get-base-name for a.png
            .mockResolvedValueOnce("c"); // fs-get-base-name for c.png
        const result = yield adapter.listImages();
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-list-images", {
            directory,
        });
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-get-base-name", {
            file: "a.png",
        });
        (0, globals_1.expect)(window.ipc.invoke).toHaveBeenCalledWith("fs-get-base-name", {
            file: "c.png",
        });
        (0, globals_1.expect)(result).toEqual(["a", "c"]);
    }));
});
