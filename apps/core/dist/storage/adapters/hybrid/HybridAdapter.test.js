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
const HybridAdapter_1 = require("./HybridAdapter");
const createMockAdapter = () => ({
    saveImage: globals_1.jest.fn(),
    loadImage: globals_1.jest.fn(),
    deleteImage: globals_1.jest.fn(),
    listImages: globals_1.jest.fn(),
});
(0, globals_1.describe)("HybridAdapter", () => {
    let local;
    let remote;
    let adapter;
    (0, globals_1.beforeEach)(() => {
        local = createMockAdapter();
        remote = createMockAdapter();
        adapter = new HybridAdapter_1.HybridAdapter(local, remote);
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(HybridAdapter_1.HybridAdapter).toBeDefined();
    });
    (0, globals_1.it)("should call saveImage on both local and remote", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img1";
        const data = Buffer.from("data");
        // Act
        yield adapter.saveImage(id, data);
        // Assert
        (0, globals_1.expect)(local.saveImage).toHaveBeenCalledWith(id, data);
        (0, globals_1.expect)(remote.saveImage).toHaveBeenCalledWith(id, data);
    }));
    (0, globals_1.it)("should load image from local if available", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img2";
        const buffer = Buffer.from("abc");
        local.loadImage.mockResolvedValue(buffer);
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        (0, globals_1.expect)(local.loadImage).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(result).toBe(buffer);
        (0, globals_1.expect)(remote.loadImage).not.toHaveBeenCalled();
    }));
    (0, globals_1.it)("should load image from remote if local fails", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img3";
        local.loadImage.mockRejectedValue(new Error("fail"));
        const remoteBuffer = Buffer.from("remote");
        remote.loadImage.mockResolvedValue(remoteBuffer);
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        (0, globals_1.expect)(local.loadImage).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(remote.loadImage).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(result).toBe(remoteBuffer);
    }));
    (0, globals_1.it)("should convert string result to Buffer in loadImage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img4";
        local.loadImage.mockResolvedValue("stringdata");
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        (0, globals_1.expect)(result).toEqual(Buffer.from("stringdata"));
    }));
    (0, globals_1.it)("should call deleteImage on both local and remote", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img5";
        // Act
        yield adapter.deleteImage(id);
        // Assert
        (0, globals_1.expect)(local.deleteImage).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(remote.deleteImage).toHaveBeenCalledWith(id);
    }));
    (0, globals_1.it)("should list images from local", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const images = ["a", "b"];
        local.listImages.mockResolvedValue(images);
        // Act
        const result = yield adapter.listImages();
        // Assert
        (0, globals_1.expect)(local.listImages).toHaveBeenCalled();
        (0, globals_1.expect)(result).toBe(images);
    }));
});
