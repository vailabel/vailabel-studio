"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationDataAccess = void 0;
const DataAccess_1 = require("./DataAccess");
class AnnotationDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("annotations");
    }
}
exports.AnnotationDataAccess = AnnotationDataAccess;
