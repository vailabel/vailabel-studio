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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AzureBlobStorageAdapter_1 = require("./AzureBlobStorageAdapter");
const createMockBlob = () => ({
    uploadData: globals_1.jest.fn(),
    download: globals_1.jest.fn(),
});
(0, globals_1.describe)("AzureBlobStorageAdapter", () => {
    let containerClient;
    let adapter;
    (0, globals_1.beforeEach)(() => {
        containerClient = {
            getBlockBlobClient: globals_1.jest.fn(),
            deleteBlob: globals_1.jest.fn(),
            listBlobsFlat: globals_1.jest.fn(),
        };
        adapter = new AzureBlobStorageAdapter_1.AzureBlobStorageAdapter(containerClient);
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(AzureBlobStorageAdapter_1.AzureBlobStorageAdapter).toBeDefined();
    });
    (0, globals_1.it)("should save image using uploadData", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img1";
        const data = Buffer.from("data");
        const mockBlob = createMockBlob();
        containerClient.getBlockBlobClient.mockReturnValue(mockBlob);
        // Act
        yield adapter.saveImage(id, data);
        // Assert
        (0, globals_1.expect)(containerClient.getBlockBlobClient).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(mockBlob.uploadData).toHaveBeenCalledWith(data);
    }));
    (0, globals_1.it)("should load image and return buffer", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img2";
        const chunk1 = Buffer.from([1, 2]);
        const chunk2 = Buffer.from([3, 4]);
        const mockBlob = createMockBlob();
        mockBlob.download.mockResolvedValue({
            readableStreamBody: {
                [Symbol.asyncIterator]() {
                    return __asyncGenerator(this, arguments, function* _a() {
                        yield yield __await(chunk1);
                        yield yield __await(chunk2);
                    });
                },
            },
        });
        containerClient.getBlockBlobClient.mockReturnValue(mockBlob);
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        (0, globals_1.expect)(containerClient.getBlockBlobClient).toHaveBeenCalledWith(id);
        (0, globals_1.expect)(mockBlob.download).toHaveBeenCalled();
        (0, globals_1.expect)(result).toEqual(Buffer.concat([chunk1, chunk2]));
    }));
    (0, globals_1.it)("should delete image using deleteBlob", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img3";
        // Act
        yield adapter.deleteImage(id);
        // Assert
        (0, globals_1.expect)(containerClient.deleteBlob).toHaveBeenCalledWith(id);
    }));
    (0, globals_1.it)("should list all blob names", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const blobs = [{ name: "a.png" }, { name: "b.png" }];
        containerClient.listBlobsFlat.mockReturnValue({
            [Symbol.asyncIterator]() {
                return __asyncGenerator(this, arguments, function* _a() {
                    for (const blob of blobs)
                        yield yield __await(blob);
                });
            },
        });
        // Act
        const result = yield adapter.listImages();
        // Assert
        (0, globals_1.expect)(result).toEqual(["a.png", "b.png"]);
    }));
});
