"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModelDataAccess = void 0;
const DataAccess_1 = require("./DataAccess");
class AIModelDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("ai_models");
    }
}
exports.AIModelDataAccess = AIModelDataAccess;
