"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDataAccess = void 0;
const models_1 = require("../../../models");
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
class ProjectDataAccess extends SQLiteDataAccess_1.SQLiteDataAccess {
    constructor() {
        super(models_1.Project);
    }
}
exports.ProjectDataAccess = ProjectDataAccess;
