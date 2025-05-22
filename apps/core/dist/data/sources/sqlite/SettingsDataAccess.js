"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class SettingsDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("settings");
    }
}
exports.SettingsDataAccess = SettingsDataAccess;
