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
exports.S3StorageAdapter = void 0;
const aws_sdk_1 = require("aws-sdk");
class S3StorageAdapter {
    constructor(bucket, s3 = new aws_sdk_1.S3()) {
        this.bucket = bucket;
        this.s3 = s3;
    }
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.s3
                .putObject({
                Bucket: this.bucket,
                Key: id,
                Body: data,
            })
                .promise();
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.s3
                .getObject({ Bucket: this.bucket, Key: id })
                .promise();
            return result.Body;
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.s3.deleteObject({ Bucket: this.bucket, Key: id }).promise();
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const result = yield this.s3
                .listObjectsV2({ Bucket: this.bucket })
                .promise();
            return (_b = (_a = result.Contents) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.Key)) !== null && _b !== void 0 ? _b : [];
        });
    }
}
exports.S3StorageAdapter = S3StorageAdapter;
