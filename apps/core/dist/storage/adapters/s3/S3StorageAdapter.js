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
const client_s3_1 = require("@aws-sdk/client-s3");
const credential_provider_cognito_identity_1 = require("@aws-sdk/credential-provider-cognito-identity");
class S3StorageAdapter {
    constructor(bucket, region, identityPoolId) {
        this.bucket = bucket;
        this.s3 = new client_s3_1.S3Client(Object.assign({ region, credentials: (0, credential_provider_cognito_identity_1.fromCognitoIdentityPool)({
                identityPoolId,
                clientConfig: { region },
            }) }, (typeof window !== "undefined" ? { runtime: "browser" } : {})));
    }
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: id,
                Body: data,
            }));
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: id }));
            // result.Body is a stream, so we need to convert it to Buffer
            const stream = result.Body;
            const reader = stream.getReader();
            const chunks = [];
            let done = false;
            while (!done) {
                const { value, done: doneReading } = yield reader.read();
                if (value)
                    chunks.push(value);
                done = doneReading;
            }
            return Buffer.concat(chunks);
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: id }));
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const result = yield this.s3.send(new client_s3_1.ListObjectsV2Command({ Bucket: this.bucket }));
            return (_b = (_a = result.Contents) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.Key)) !== null && _b !== void 0 ? _b : [];
        });
    }
}
exports.S3StorageAdapter = S3StorageAdapter;
