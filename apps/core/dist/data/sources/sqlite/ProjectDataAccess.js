"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectDataAccess = void 0;
const data_1 = require("@vailabel/core/src/data");
class ProjectDataAccess extends data_1.DataAccess {
    constructor() {
        super("projects");
    }
}
exports.ProjectDataAccess = ProjectDataAccess;
