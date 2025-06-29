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
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class SettingsDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.Settings);
    }
    getByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield window.ipc.invoke("sqlite:getByKey", models_1.Settings.name, key));
        });
    }
    updateByKey(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            ;
            (yield window.ipc.invoke("sqlite:updateByKey", models_1.Settings.name, key, {
                value: JSON.stringify(value),
            }));
        });
    }
    deleteByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            ;
            (yield window.ipc.invoke("sqlite:deleteByKey", models_1.Settings.name, key));
        });
    }
}
exports.SettingsDataAccess = SettingsDataAccess;
