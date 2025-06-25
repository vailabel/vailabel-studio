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
const DataAccess_1 = require("../../contracts/DataAccess");
class ImageDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.ImageData);
    }
    getImageWithAnnotations(imageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use Sequelize to include annotations
            const image = yield models_1.ImageData.findByPk(imageId, {
                include: [models_1.Annotation],
            });
            return image;
        });
    }
    getNext(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find the next image by id in the same project
            const next = yield models_1.ImageData.findOne({
                where: { projectId, id: { $gt: currentImageId } },
                order: [["id", "ASC"]],
            });
            const hasNext = !!next;
            return { id: next === null || next === void 0 ? void 0 : next.id, hasNext };
        });
    }
    getPrevious(projectId, currentImageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find the previous image by id in the same project
            const prev = yield models_1.ImageData.findOne({
                where: { projectId, id: { $lt: currentImageId } },
                order: [["id", "DESC"]],
            });
            const hasPrevious = !!prev;
            return { id: prev === null || prev === void 0 ? void 0 : prev.id, hasPrevious };
        });
    }
    getByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.ImageData.findAll({ where: { projectId } });
        });
    }
    countByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.ImageData.count({ where: { projectId } });
        });
    }
}
exports.ImageDataAccess = ImageDataAccess;
