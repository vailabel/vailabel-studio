"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDataAccess = void 0;
const models_1 = require("../../../models");
const DataAccess_1 = require("../../contracts/DataAccess");
class ProjectDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super(models_1.Project);
    }
}
exports.ProjectDataAccess = ProjectDataAccess;
