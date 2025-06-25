"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class HistoryDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.History);
    }
}
exports.HistoryDataAccess = HistoryDataAccess;
