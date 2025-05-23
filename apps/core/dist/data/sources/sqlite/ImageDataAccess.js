"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageDataAccess = void 0;
const DataAccess_1 = require("../../contracts/DataAccess");
class ImageDataAccess extends DataAccess_1.DataAccess {
    constructor() {
        super("images");
    }
}
exports.ImageDataAccess = ImageDataAccess;
