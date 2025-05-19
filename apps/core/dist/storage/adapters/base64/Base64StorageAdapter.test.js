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
const Base64StorageAdapter_1 = require("./Base64StorageAdapter");
(0, globals_1.describe)("Base64StorageAdapter", () => {
    let adapter;
    let store;
    let localStorageMock;
    (0, globals_1.beforeEach)(() => {
        store = {};
        localStorageMock = {
            getItem: globals_1.jest.fn((key) => store[key] || null),
            setItem: globals_1.jest.fn((key, value) => {
                store[key] = value;
            }),
            removeItem: globals_1.jest.fn((key) => {
                delete store[key];
            }),
            key: globals_1.jest.fn((i) => Object.keys(store)[i] || null),
            get length() {
                return Object.keys(store).length;
            },
            clear: globals_1.jest.fn(() => {
                for (const k in store)
                    delete store[k];
            }),
        };
        Object.defineProperty(global, "localStorage", {
            value: localStorageMock,
            configurable: true,
        });
        adapter = new Base64StorageAdapter_1.Base64StorageAdapter();
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(Base64StorageAdapter_1.Base64StorageAdapter).toBeDefined();
    });
    (0, globals_1.it)("should save image to localStorage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img1";
        const data = "base64data";
        // Act
        yield adapter.saveImage(id, data);
        // Assert
        (0, globals_1.expect)(localStorage.setItem).toHaveBeenCalledWith("img_" + id, data);
        (0, globals_1.expect)(store["img_" + id]).toBe(data);
    }));
    (0, globals_1.it)("should throw error if localStorage.setItem fails", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        localStorage.setItem.mockImplementation(() => {
            throw new Error("fail");
        });
        // Act & Assert
        yield (0, globals_1.expect)(adapter.saveImage("id", "data")).rejects.toThrow("Failed to save image: fail");
    }));
    (0, globals_1.it)("should load image from localStorage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img2";
        const data = "base64img";
        store["img_" + id] = data;
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        (0, globals_1.expect)(localStorage.getItem).toHaveBeenCalledWith("img_" + id);
        (0, globals_1.expect)(result).toBe(data);
    }));
    (0, globals_1.it)("should throw error if image not found in loadImage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "notfound";
        // Act & Assert
        yield (0, globals_1.expect)(adapter.loadImage(id)).rejects.toThrow("Image not found");
    }));
    (0, globals_1.it)("should delete image from localStorage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img3";
        store["img_" + id] = "data";
        // Act
        yield adapter.deleteImage(id);
        // Assert
        (0, globals_1.expect)(localStorage.removeItem).toHaveBeenCalledWith("img_" + id);
        (0, globals_1.expect)(store["img_" + id]).toBeUndefined();
    }));
    (0, globals_1.it)("should list all image ids from localStorage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Use deterministic IDs for compatibility and test stability
        const idA = "idA";
        const idB = "idB";
        // Directly set the store to simulate localStorage content
        store["img_" + idA] = "data";
        store["img_" + idB] = "data";
        // Act
        const result = yield adapter.listImages();
        // Assert
        const expected = [idA, idB];
        (0, globals_1.expect)(localStorage.key).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(result).toEqual(expected);
        (0, globals_1.expect)(result.length).toBe(2);
        (0, globals_1.expect)(result).toContain(idA);
        (0, globals_1.expect)(result).toContain(idB);
    }));
});
