"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryDataAccess = void 0;
const DataAccess_1 = require("./DataAccess");
class HistoryDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("history");
    }
}
exports.HistoryDataAccess = HistoryDataAccess;
