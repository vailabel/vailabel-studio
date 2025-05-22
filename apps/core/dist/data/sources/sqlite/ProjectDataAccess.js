"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDataAccess = void 0;
const DataAccess_1 = require("./DataAccess");
class ProjectDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("projects");
    }
}
exports.ProjectDataAccess = ProjectDataAccess;
