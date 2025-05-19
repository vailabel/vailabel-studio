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
exports.Base64StorageAdapter = void 0;
class Base64StorageAdapter {
    saveImage(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                localStorage.setItem(Base64StorageAdapter.prefix + id, data);
            }
            catch (e) {
                throw new Error("Failed to save image: " + e.message);
            }
        });
    }
    loadImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = localStorage.getItem(Base64StorageAdapter.prefix + id);
            if (!data)
                throw new Error("Image not found");
            return data;
        });
    }
    deleteImage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            localStorage.removeItem(Base64StorageAdapter.prefix + id);
        });
    }
    listImages() {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(Base64StorageAdapter.prefix)) {
                    keys.push(key.replace(Base64StorageAdapter.prefix, ""));
                }
            }
            return keys;
        });
    }
}
exports.Base64StorageAdapter = Base64StorageAdapter;
Base64StorageAdapter.prefix = "img_";
