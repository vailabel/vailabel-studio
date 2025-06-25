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
exports.AnnotationDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class AnnotationDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.Annotation);
    }
    countByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Count annotations by projectId using Sequelize
            return models_1.Annotation.count({ where: { projectId } });
        });
    }
    getByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find all annotations by projectId using Sequelize
            return models_1.Annotation.findAll({ where: { projectId } });
        });
    }
}
exports.AnnotationDataAccess = AnnotationDataAccess;
