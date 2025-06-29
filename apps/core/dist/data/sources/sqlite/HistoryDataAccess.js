"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryDataAccess = void 0;
const models_1 = require("../../../models");
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class HistoryDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.History);
    }
}
exports.HistoryDataAccess = HistoryDataAccess;
