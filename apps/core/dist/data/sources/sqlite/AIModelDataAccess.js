"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModelDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class AIModelDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.AIModel);
    }
}
exports.AIModelDataAccess = AIModelDataAccess;
