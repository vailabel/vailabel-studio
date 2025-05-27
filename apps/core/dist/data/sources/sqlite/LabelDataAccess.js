"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class LabelDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("labels");
    }
    countByProjectId(projectId) {
        const result = window.ipc.invoke("sqlite:get", [
            `SELECT COUNT(*) as count FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
        return result.then((data) => data.count);
    }
    getByProjectId(projectId) {
        const result = window.ipc.invoke("sqlite:all", [
            `SELECT * FROM ${this.table} WHERE projectId = ?`,
            [projectId],
        ]);
        return result.then((data) => data.map((item) => (Object.assign(Object.assign({}, item), { data: item.data }))));
    }
}
exports.LabelDataAccess = LabelDataAccess;
