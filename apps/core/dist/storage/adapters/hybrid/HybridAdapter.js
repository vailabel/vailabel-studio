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
exports.HybridAdapter = void 0;
class HybridAdapter {
    constructor(local, remote) {
        this.local = local;
        this.remote = remote;
    }
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.local.saveImage(id, data);
            yield this.remote.saveImage(id, data);
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.local.loadImage(id);
                return typeof result === "string" ? Buffer.from(result) : result;
            }
            catch (e) {
                console.warn(`Local load failed, falling back to remote: ${e}`);
                const result = yield this.remote.loadImage(id);
                return typeof result === "string" ? Buffer.from(result) : result;
            }
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.local.deleteImage(id);
            yield this.remote.deleteImage(id);
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.local.listImages();
        });
    }
}
exports.HybridAdapter = HybridAdapter;
