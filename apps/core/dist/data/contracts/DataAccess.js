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
    constructor(model) {
        this.model = model;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.model.findAll());
        });
    }
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.model.findByPk(id));
        });
    }
    create(item) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.create(item);
        });
    }
    update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.update(updates, { where: { id } });
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.model.destroy({ where: { id } });
        });
    }
    paginate(offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.model.findAll({ offset, limit }));
        });
    }
}
exports.DataAccess = DataAccess;
