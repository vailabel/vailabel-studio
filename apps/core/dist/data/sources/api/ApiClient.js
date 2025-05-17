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
exports.ApiClient = void 0;
class ApiClient {
    constructor(options = {}) {
        var _a, _b;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.baseUrl = options.baseUrl || "/api";
        this.headers = options.headers || { "Content-Type": "application/json" };
        this.getAuthToken = options.getAuthToken;
        this.cacheEnabled = (_a = options.cache) !== null && _a !== void 0 ? _a : false;
        this.cacheDuration = (_b = options.cacheDuration) !== null && _b !== void 0 ? _b : 5 * 60 * 1000; // default 5 minutes
        this.cacheStore = new Map();
    }
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    applyRequestInterceptors(input, init) {
        return __awaiter(this, void 0, void 0, function* () {
            let req = [input, init];
            for (const interceptor of this.requestInterceptors) {
                req = yield interceptor(req[0], req[1]);
            }
            return req;
        });
    }
    applyResponseInterceptors(response) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = response;
            for (const interceptor of this.responseInterceptors) {
                res = yield interceptor(res);
            }
            return res;
        });
    }
    withAuth() {
        return __awaiter(this, arguments, void 0, function* (init = {}) {
            if (!this.getAuthToken)
                return init;
            const token = yield this.getAuthToken();
            if (token) {
                return Object.assign(Object.assign({}, init), { headers: Object.assign(Object.assign(Object.assign({}, this.headers), (init.headers || {})), { Authorization: `Bearer ${token}` }) });
            }
            return Object.assign(Object.assign({}, init), { headers: Object.assign(Object.assign({}, this.headers), (init.headers || {})) });
        });
    }
    cacheKey(method, path, body) {
        return `${method}:${this.baseUrl}${path}:${body ? JSON.stringify(body) : ""}`;
    }
    get(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.cacheKey("GET", path);
            const now = Date.now();
            if (this.cacheEnabled && this.cacheStore.has(key)) {
                const cached = this.cacheStore.get(key);
                if (cached && now < cached.expires) {
                    return cached.value;
                }
                else {
                    this.cacheStore.delete(key);
                }
            }
            const [url, init] = yield this.applyRequestInterceptors(this.baseUrl + path, { method: "GET", headers: this.headers });
            const finalInit = yield this.withAuth(init);
            let res = yield fetch(url, finalInit);
            res = yield this.applyResponseInterceptors(res);
            const data = yield res.json();
            if (this.cacheEnabled) {
                this.cacheStore.set(key, {
                    value: data,
                    expires: now + this.cacheDuration,
                });
            }
            return data;
        });
    }
    post(path, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const [url, init] = yield this.applyRequestInterceptors(this.baseUrl + path, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(body),
            });
            const finalInit = yield this.withAuth(init);
            let res = yield fetch(url, finalInit);
            res = yield this.applyResponseInterceptors(res);
            return res.json();
        });
    }
    put(path, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const [url, init] = yield this.applyRequestInterceptors(this.baseUrl + path, {
                method: "PUT",
                headers: this.headers,
                body: JSON.stringify(body),
            });
            const finalInit = yield this.withAuth(init);
            let res = yield fetch(url, finalInit);
            res = yield this.applyResponseInterceptors(res);
            return res.json();
        });
    }
    delete(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const [url, init] = yield this.applyRequestInterceptors(this.baseUrl + path, {
                method: "DELETE",
                headers: this.headers,
            });
            const finalInit = yield this.withAuth(init);
            let res = yield fetch(url, finalInit);
            res = yield this.applyResponseInterceptors(res);
            if (res.status === 204)
                return undefined;
            return res.json();
        });
    }
    clearCache() {
        this.cacheStore.clear();
    }
}
exports.ApiClient = ApiClient;
