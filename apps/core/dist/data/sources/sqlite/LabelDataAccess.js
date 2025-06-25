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
exports.LabelDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class LabelDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.Label);
    }
    countByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.Label.count({ where: { projectId } });
        });
    }
    getByProjectId(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.Label.findAll({ where: { projectId } });
        });
    }
}
exports.LabelDataAccess = LabelDataAccess;
