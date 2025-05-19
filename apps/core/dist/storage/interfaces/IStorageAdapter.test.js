"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DexieDataAccess_1 = require("../../data/sources/dexie/DexieDataAccess");
const ApiDataAccess_1 = require("../../data/sources/api/ApiDataAccess");
const SQLiteDataAccess_1 = require("../../data/sources/sqlite/SQLiteDataAccess");
(0, globals_1.describe)("Interface and DataAccess", () => {
    (0, globals_1.it)("DexieDataAccess should be defined", () => {
        (0, globals_1.expect)(DexieDataAccess_1.DexieDataAccess).toBeDefined();
    });
    (0, globals_1.it)("ApiDataAccess should be defined", () => {
        (0, globals_1.expect)(ApiDataAccess_1.ApiDataAccess).toBeDefined();
    });
    (0, globals_1.it)("SQLiteDataAccess should be defined", () => {
        (0, globals_1.expect)(SQLiteDataAccess_1.SQLiteDataAccess).toBeDefined();
    });
});
