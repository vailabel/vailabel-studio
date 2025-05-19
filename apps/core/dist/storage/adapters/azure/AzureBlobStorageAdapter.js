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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobStorageAdapter = void 0;
class AzureBlobStorageAdapter {
    constructor(containerClient) {
        this.containerClient = containerClient;
    }
    uploadModel(file) {
        throw new Error("Method not implemented.");
    }
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const blob = this.containerClient.getBlockBlobClient(id);
            yield blob.uploadData(data);
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const blob = this.containerClient.getBlockBlobClient(id);
            const response = yield blob.download();
            const stream = response.readableStreamBody;
            const chunks = [];
            try {
                for (var _d = true, _e = __asyncValues(stream), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const chunk = _c;
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return Buffer.concat(chunks);
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.containerClient.deleteBlob(id);
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_2, _b, _c;
            const names = [];
            try {
                for (var _d = true, _e = __asyncValues(this.containerClient.listBlobsFlat()), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const blob = _c;
                    names.push(blob.name);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return names;
        });
    }
}
exports.AzureBlobStorageAdapter = AzureBlobStorageAdapter;
