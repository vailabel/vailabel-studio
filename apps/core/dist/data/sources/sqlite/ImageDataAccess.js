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
exports.ImageDataAccess = void 0;
const models_1 = require("../../../models");
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class ImageDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.ImageData);
    }
    getImageWithAnnotations(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use Sequelize to include annotations
            const image = (yield window.ipc.invoke("sqlite:getById", models_1.ImageData.name, imageId));
            return image;
        });
    }
    getNext(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find the next image by id in the same project
            const next = (yield window.ipc.invoke("sqlite:getNext", models_1.ImageData.name, projectId, currentImageId));
            return next;
        });
    }
    getPrevious(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find the previous image by id in the same project
            const prev = (yield window.ipc.invoke("sqlite:getPrevious", models_1.ImageData.name, projectId, currentImageId));
            return prev;
        });
    }
    getByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield window.ipc.invoke("sqlite:getByProjectId", models_1.ImageData.name, projectId));
        });
    }
    countByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield window.ipc.invoke("sqlite:count", models_1.ImageData.name, {
                projectId,
            }));
        });
    }
}
exports.ImageDataAccess = ImageDataAccess;
