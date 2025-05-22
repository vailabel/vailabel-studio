"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelDataAccess = void 0;
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class LabelDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super("labels");
    }
}
exports.LabelDataAccess = LabelDataAccess;
