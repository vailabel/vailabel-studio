"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class LabelDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("labels");
    }
}
exports.LabelDataAccess = LabelDataAccess;
