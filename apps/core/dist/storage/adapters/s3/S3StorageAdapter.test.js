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
const S3StorageAdapter_1 = require("./S3StorageAdapter");
globals_1.jest.mock("@aws-sdk/client-s3", () => {
    return {
        S3Client: globals_1.jest.fn().mockImplementation(() => ({ send: globals_1.jest.fn() })),
        PutObjectCommand: globals_1.jest.fn(),
        GetObjectCommand: globals_1.jest.fn(),
        DeleteObjectCommand: globals_1.jest.fn(),
        ListObjectsV2Command: globals_1.jest.fn(),
    };
});
globals_1.jest.mock("@aws-sdk/credential-provider-cognito-identity", () => ({
    fromCognitoIdentityPool: globals_1.jest.fn(() => ({})),
}));
(0, globals_1.describe)("S3StorageAdapter", () => {
    let adapter;
    let s3Instance;
    const bucket = "test-bucket";
    const region = "us-east-1";
    const identityPoolId = "pool-id";
    (0, globals_1.beforeEach)(() => {
        // Arrange
        const { S3Client } = require("@aws-sdk/client-s3");
        s3Instance = { send: globals_1.jest.fn() };
        S3Client.mockImplementation(() => s3Instance);
        adapter = new S3StorageAdapter_1.S3StorageAdapter(bucket, region, identityPoolId);
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(S3StorageAdapter_1.S3StorageAdapter).toBeDefined();
    });
    (0, globals_1.it)("should call send with PutObjectCommand on saveImage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img1";
        const data = Buffer.from("data");
        // Act
        yield adapter.saveImage(id, data);
        // Assert
        const { PutObjectCommand } = require("@aws-sdk/client-s3");
        (0, globals_1.expect)(PutObjectCommand).toHaveBeenCalledWith({
            Bucket: bucket,
            Key: id,
            Body: data,
        });
        (0, globals_1.expect)(s3Instance.send).toHaveBeenCalled();
    }));
    (0, globals_1.it)("should call send with GetObjectCommand and return buffer on loadImage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img2";
        const chunk1 = new Uint8Array([1, 2]);
        const chunk2 = new Uint8Array([3, 4]);
        const mockStream = {
            getReader: () => {
                let call = 0;
                return {
                    read: globals_1.jest.fn().mockImplementation(() => {
                        call++;
                        if (call === 1)
                            return Promise.resolve({ value: chunk1, done: false });
                        if (call === 2)
                            return Promise.resolve({ value: chunk2, done: false });
                        return Promise.resolve({ value: undefined, done: true });
                    }),
                };
            },
        };
        s3Instance.send.mockResolvedValueOnce({ Body: mockStream });
        // Act
        const result = yield adapter.loadImage(id);
        // Assert
        const { GetObjectCommand } = require("@aws-sdk/client-s3");
        (0, globals_1.expect)(GetObjectCommand).toHaveBeenCalledWith({ Bucket: bucket, Key: id });
        (0, globals_1.expect)(result).toEqual(Buffer.concat([chunk1, chunk2]));
    }));
    (0, globals_1.it)("should call send with DeleteObjectCommand on deleteImage", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const id = "img3";
        // Act
        yield adapter.deleteImage(id);
        // Assert
        const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
        (0, globals_1.expect)(DeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: bucket,
            Key: id,
        });
        (0, globals_1.expect)(s3Instance.send).toHaveBeenCalled();
    }));
    (0, globals_1.it)("should call send with ListObjectsV2Command and return image keys on listImages", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const objects = [{ Key: "a.png" }, { Key: "b.png" }];
        s3Instance.send.mockResolvedValueOnce({ Contents: objects });
        // Act
        const result = yield adapter.listImages();
        // Assert
        const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
        (0, globals_1.expect)(ListObjectsV2Command).toHaveBeenCalledWith({ Bucket: bucket });
        (0, globals_1.expect)(result).toEqual(["a.png", "b.png"]);
    }));
    (0, globals_1.it)("should return empty array if Contents is undefined in listImages", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        s3Instance.send.mockResolvedValueOnce({});
        // Act
        const result = yield adapter.listImages();
        // Assert
        (0, globals_1.expect)(result).toEqual([]);
    }));
});
