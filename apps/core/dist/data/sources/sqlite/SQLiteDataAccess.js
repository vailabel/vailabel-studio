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
exports.SQLiteDataAccess = void 0;
class SQLiteDataAccess {
    constructor(model) {
        this.model = model;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("sqlite:get", this.model.name);
        });
    }
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("sqlite:getById", this.model.name, id);
        });
    }
    create(item) {
        return __awaiter(this, void 0, void 0, function* () {
            ;
            (yield window.ipc.invoke("sqlite:create", this.model.name, item));
        });
    }
    update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            ;
            (yield window.ipc.invoke("sqlite:update", this.model.name, id, updates));
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ;
            (yield window.ipc.invoke("sqlite:delete", this.model.name, id));
        });
    }
    paginate(offset, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            return window.ipc.invoke("sqlite:paginate", this.model.name, offset, limit);
        });
    }
}
exports.SQLiteDataAccess = SQLiteDataAccess;
