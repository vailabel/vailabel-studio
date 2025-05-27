"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class AnnotationDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("annotations");
    }
    countByProjectId(projectId) {
        const result = window.ipc.invoke("sqlite:get", [
            `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
        return result.then((data) => data.count);
    }
    getByProjectId(projectId) {
        const result = window.ipc.invoke("sqlite:get", [
            `SELECT * FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
        return result.then((data) => data.map((item) => (Object.assign(Object.assign({}, item), { data: item.data }))));
    }
}
exports.AnnotationDataAccess = AnnotationDataAccess;
