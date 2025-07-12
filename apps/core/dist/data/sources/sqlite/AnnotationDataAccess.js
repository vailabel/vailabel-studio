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
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class AnnotationDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.Annotation);
    }
    countByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Count annotations by projectId using Sequelize
            return (yield window.ipc.invoke("sqlite:count", models_1.Annotation.name, {
                projectId,
            }));
        });
    }
    getByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find all annotations by projectId using Sequelize
            return (yield window.ipc.invoke("sqlite:getByProjectId", models_1.Annotation.name, projectId));
        });
    }
}
exports.AnnotationDataAccess = AnnotationDataAccess;
