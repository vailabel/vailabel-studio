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
exports.SettingsDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class SettingsDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.Settings);
    }
    getByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return models_1.Settings.findOne({ where: { key } });
        });
    }
    updateByKey(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield models_1.Settings.update({ value: JSON.stringify(value) }, { where: { key } });
        });
    }
    deleteByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield models_1.Settings.destroy({ where: { key } });
        });
    }
}
exports.SettingsDataAccess = SettingsDataAccess;
