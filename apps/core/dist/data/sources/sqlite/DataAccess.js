"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAccess = void 0;
class DataAccess {
    constructor(table) {
        this.table = table;
    }
    // Generic CRUD methods
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("sqlite:all", [`SELECT * FROM ${this.table}`, []]);
        });
    }
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield window.ipc.invoke("sqlite:get", [
                `SELECT * FROM ${this.table} WHERE id = ?`,
                [id],
            ]);
            return row || null;
        });
    }
    create(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const flatItem = {};
            for (const [key, value] of Object.entries(item)) {
                if (typeof value !== "object" || // Keep primitives
                    value === null || // Allow null
                    value instanceof Date ||
                    key === "coordinates") {
                    flatItem[key] = value;
                }
            }
            console.log("flatItem", flatItem);
            const keys = Object.keys(flatItem);
            const values = Object.values(flatItem);
            const placeholders = keys.map(() => "?").join(", ");
            yield window.ipc.invoke("sqlite:run", [
                `INSERT INTO ${this.table} (${keys.join(", ")}) VALUES (${placeholders})`,
                values,
            ]);
        });
    }
    update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const setClause = Object.keys(updates)
                .map((key) => `${key} = ?`)
                .join(", ");
            const values = Object.values(updates);
            yield window.ipc.invoke("sqlite:run", [
                `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
                [...values, id],
            ]);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield window.ipc.invoke("sqlite:run", [
                `DELETE FROM ${this.table} WHERE id = ?`,
                [id],
            ]);
        });
    }
    paginate(offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("sqlite:all", [
                `SELECT * FROM ${this.table} LIMIT ? OFFSET ?`,
                [limit, offset],
            ]);
        });
    }
}
exports.DataAccess = DataAccess;
