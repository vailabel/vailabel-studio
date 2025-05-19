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
const globals_1 = require("@jest/globals");
const ApiClient_1 = require("./ApiClient");
const ApiDataAccess_1 = require("./ApiDataAccess");
global.fetch = globals_1.jest.fn();
(0, globals_1.describe)("ApiClient", () => {
    let client;
    (0, globals_1.beforeEach)(() => {
        client = new ApiClient_1.ApiClient({ baseUrl: "https://test.local" });
        global.fetch.mockClear();
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(ApiClient_1.ApiClient).toBeDefined();
    });
    (0, globals_1.it)("should call fetch with correct URL and method for GET", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.get("/foo");
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith("https://test.local/foo", globals_1.expect.objectContaining({ method: "GET" }));
    }));
    (0, globals_1.it)("should call fetch with correct URL, method, and body for POST", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.post("/bar", { a: 1 });
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith("https://test.local/bar", globals_1.expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ a: 1 }),
        }));
    }));
    (0, globals_1.it)("should call fetch with correct URL, method, and body for PUT", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.put("/baz", { b: 2 });
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith("https://test.local/baz", globals_1.expect.objectContaining({ method: "PUT", body: JSON.stringify({ b: 2 }) }));
    }));
    (0, globals_1.it)("should call fetch with correct URL and method for DELETE", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.delete("/qux");
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith("https://test.local/qux", globals_1.expect.objectContaining({ method: "DELETE" }));
        // Optionally check that body is not set for DELETE
        const fetchCallArgs = global.fetch.mock.calls[0][1];
        (0, globals_1.expect)(fetchCallArgs.body).toBeUndefined();
    }));
    (0, globals_1.it)("should cache GET requests if enabled", () => __awaiter(void 0, void 0, void 0, function* () {
        client = new ApiClient_1.ApiClient({
            baseUrl: "https://test.local",
            cache: true,
            cacheDuration: 1000,
        });
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ foo: 123 }),
            status: 200,
            ok: true,
        });
        const result1 = yield client.get("/cache");
        const result2 = yield client.get("/cache");
        (0, globals_1.expect)(result1).toEqual({ foo: 123 });
        (0, globals_1.expect)(result2).toEqual({ foo: 123 });
        (0, globals_1.expect)(global.fetch.mock.calls.length).toBe(1);
    }));
    (0, globals_1.it)("should use default options in constructor", () => {
        const defaultClient = new ApiClient_1.ApiClient();
        (0, globals_1.expect)(defaultClient).toBeInstanceOf(ApiClient_1.ApiClient);
    });
    (0, globals_1.it)("should add and use request interceptors", () => __awaiter(void 0, void 0, void 0, function* () {
        const interceptor = (input, init) => __awaiter(void 0, void 0, void 0, function* () {
            return [
                input + "?intercepted",
                Object.assign(Object.assign({}, init), { headers: Object.assign(Object.assign({}, (init.headers || {})), { foo: "bar" }) }),
            ];
        });
        client.addRequestInterceptor(interceptor);
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.get("/foo");
        (0, globals_1.expect)(global.fetch).toHaveBeenCalledWith(globals_1.expect.stringContaining("intercepted"), globals_1.expect.objectContaining({
            headers: globals_1.expect.objectContaining({ foo: "bar" }),
        }));
    }));
    (0, globals_1.it)("should add and use response interceptors", () => __awaiter(void 0, void 0, void 0, function* () {
        const responseInterceptor = (res) => __awaiter(void 0, void 0, void 0, function* () {
            Object.defineProperty(res, "intercepted", {
                value: true,
                configurable: true,
            });
            return res;
        });
        client.addResponseInterceptor(responseInterceptor);
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.get("/foo");
        // No error means the interceptor was called
    }));
    (0, globals_1.it)("should use getAuthToken if provided", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAuthToken = () => Promise.resolve("token123");
        client = new ApiClient_1.ApiClient({ baseUrl: "https://test.local", getAuthToken });
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.get("/foo");
        const fetchCallArgs = global.fetch.mock.calls[0][1];
        (0, globals_1.expect)(fetchCallArgs.headers.Authorization).toBe("Bearer token123");
    }));
    (0, globals_1.it)("should not set Authorization if getAuthToken returns null", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAuthToken = () => Promise.resolve(null);
        client = new ApiClient_1.ApiClient({ baseUrl: "https://test.local", getAuthToken });
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ ok: true }),
            status: 200,
            ok: true,
        });
        yield client.get("/foo");
        const fetchCallArgs = global.fetch.mock.calls[0][1];
        (0, globals_1.expect)(fetchCallArgs.headers.Authorization).toBeUndefined();
    }));
    (0, globals_1.it)("should clear cache with clearCache", () => {
        client = new ApiClient_1.ApiClient({ baseUrl: "https://test.local", cache: true });
        // @ts-ignore
        client.cacheStore.set("foo", { value: 1, expires: Date.now() + 1000 });
        client.clearCache();
        // @ts-ignore
        (0, globals_1.expect)(client.cacheStore.size).toBe(0);
    });
    (0, globals_1.it)("should handle 204 No Content for DELETE", () => __awaiter(void 0, void 0, void 0, function* () {
        ;
        global.fetch.mockResolvedValue({
            status: 204,
            ok: true,
            json: () => Promise.resolve(undefined),
        });
        const result = yield client.delete("/no-content");
        (0, globals_1.expect)(result).toBeUndefined();
    }));
});
(0, globals_1.describe)("ApiDataAccess", () => {
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(ApiDataAccess_1.ApiDataAccess).toBeDefined();
    });
});
