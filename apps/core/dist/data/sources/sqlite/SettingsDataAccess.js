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
const DataAccess_1 = require("../../contracts/DataAccess");
class SettingsDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("settings");
    }
    getByKey(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield window.ipc.invoke("sqlite:get", [
                `SELECT * FROM ${this.table} WHERE key = ?`,
                [key],
            ]);
            if (row) {
                // Parse the value field from JSON string to object
                return Object.assign(Object.assign({}, row), { value: JSON.parse(row.value) });
            }
            return null;
        });
    }
    updateByKey(key, value) {
        return window.ipc.invoke("sqlite:run", [
            `UPDATE ${this.table} SET value = ? WHERE key = ?`,
            [JSON.stringify(value), key],
        ]);
    }
    deleteByKey(key) {
        return window.ipc.invoke("sqlite:run", [
            `DELETE FROM ${this.table} WHERE key = ?`,
            [key],
        ]);
    }
}
exports.SettingsDataAccess = SettingsDataAccess;
