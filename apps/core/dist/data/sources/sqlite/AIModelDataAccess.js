"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModelDataAccess = void 0;
const models_1 = require("../../../models");
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class AIModelDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.AIModel);
    }
}
exports.AIModelDataAccess = AIModelDataAccess;
