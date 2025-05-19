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
require("fake-indexeddb/auto");
// Polyfill structuredClone for Node.js/Jest if not present
if (typeof global.structuredClone !== "function") {
    global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
const globals_1 = require("@jest/globals");
const DexieDataAccess_1 = require("./DexieDataAccess");
const dexieDb_1 = require("@vailabel/core/src/data/db/dexieDb");
(0, globals_1.describe)("DexieDataAccess", () => {
    let dataAccess;
    const createProject = (id, name) => ({
        id,
        name: name || id,
        createdAt: new Date(),
        lastModified: new Date(),
        images: [],
    });
    const createImage = (id, projectId, name) => ({
        id,
        name: name || id,
        data: "",
        width: 1,
        height: 1,
        projectId,
        createdAt: new Date(),
    });
    (0, globals_1.beforeEach)(() => __awaiter(void 0, void 0, void 0, function* () {
        dataAccess = new DexieDataAccess_1.DexieDataAccess();
        // Clear all tables before each test to avoid cross-test pollution
        yield dexieDb_1.db.projects.clear();
        yield dexieDb_1.db.images.clear();
        yield dexieDb_1.db.annotations.clear();
        yield dexieDb_1.db.labels.clear();
        yield dexieDb_1.db.settings.clear();
        yield dexieDb_1.db.history.clear();
    }));
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(DexieDataAccess_1.DexieDataAccess).toBeDefined();
    });
    (0, globals_1.it)("should add and retrieve a project", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const project = createProject("test-id", "Test Project");
        // Act
        yield dataAccess.createProject(project);
        const projects = yield dataAccess.getProjects();
        // Assert
        (0, globals_1.expect)(projects).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ id: "test-id", name: "Test Project" }),
        ]));
    }));
    (0, globals_1.it)("should update a project", () => __awaiter(void 0, void 0, void 0, function* () {
        const project = createProject("p1", "P1");
        yield dataAccess.createProject(project);
        yield dataAccess.updateProject("p1", { name: "P1-updated" });
        const updated = yield dataAccess.getProjectById("p1");
        (0, globals_1.expect)(updated === null || updated === void 0 ? void 0 : updated.name).toBe("P1-updated");
    }));
    (0, globals_1.it)("should delete a project", () => __awaiter(void 0, void 0, void 0, function* () {
        const project = createProject("p2", "P2");
        yield dataAccess.createProject(project);
        yield dataAccess.deleteProject("p2");
        const deleted = yield dataAccess.getProjectById("p2");
        (0, globals_1.expect)(deleted).toBeUndefined();
    }));
    (0, globals_1.it)("should add and retrieve an image", () => __awaiter(void 0, void 0, void 0, function* () {
        const project = createProject("p3", "P3");
        yield dataAccess.createProject(project);
        const image = createImage("img1", "p3", "img");
        yield dataAccess.createImage(image);
        const images = yield dataAccess.getImages("p3");
        (0, globals_1.expect)(images).toEqual(globals_1.expect.arrayContaining([globals_1.expect.objectContaining({ id: "img1" })]));
    }));
    (0, globals_1.it)("should update and delete an image", () => __awaiter(void 0, void 0, void 0, function* () {
        const project = createProject("p4", "P4");
        yield dataAccess.createProject(project);
        const image = createImage("img2", "p4", "img2");
        yield dataAccess.createImage(image);
        yield dataAccess.updateImage("img2", { name: "img2-upd" });
        let updated = yield dataAccess.getImages("p4");
        (0, globals_1.expect)(updated[0].name).toBe("img2-upd");
        yield dataAccess.deleteImage("img2");
        const afterDelete = yield dataAccess.getImages("p4");
        (0, globals_1.expect)(afterDelete.length).toBe(0);
    }));
    (0, globals_1.it)("should add, update, and delete an annotation", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const project = {
            id: "p5",
            name: "P5",
            createdAt: new Date(),
            lastModified: new Date(),
            images: [],
        };
        yield dataAccess.createProject(project);
        const image = {
            id: "img3",
            name: "img3",
            data: "",
            width: 1,
            height: 1,
            projectId: "p5",
            createdAt: new Date(),
        };
        yield dataAccess.createImage(image);
        const annotation = {
            id: "a1",
            imageId: "img3",
            labelId: "",
            name: "ann",
            type: "box",
            coordinates: [],
            color: "red",
            isAIGenerated: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        yield dataAccess.createAnnotation(annotation);
        yield dataAccess.updateAnnotation("a1", { name: "ann-upd" });
        let anns = yield dataAccess.getAnnotations("img3");
        (0, globals_1.expect)(anns[0].name).toBe("ann-upd");
        yield dataAccess.deleteAnnotation("a1");
        anns = yield dataAccess.getAnnotations("img3");
        (0, globals_1.expect)(anns.length).toBe(0);
    }));
    (0, globals_1.it)("should add, update, and delete a label", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const label = {
            id: "l1",
            name: "Label1",
            color: "blue",
            category: "cat",
            isAIGenerated: false,
            projectId: "p6",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        yield dataAccess.createLabel(label, []);
        let labels = yield dataAccess.getLabels();
        (0, globals_1.expect)(labels[0].name).toBe("Label1");
        yield dataAccess.updateLabel("l1", { name: "Label1-upd" });
        const updated = yield dataAccess.getLabelById("l1");
        (0, globals_1.expect)(updated === null || updated === void 0 ? void 0 : updated.name).toBe("Label1-upd");
        yield dataAccess.deleteLabel("l1");
        labels = yield dataAccess.getLabels();
        (0, globals_1.expect)(labels.length).toBe(0);
    }));
    (0, globals_1.it)("should store and retrieve settings", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        yield dataAccess.updateSetting("theme", "dark");
        const settings = yield dataAccess.getSettings();
        (0, globals_1.expect)(settings).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ key: "theme", value: "dark" }),
        ]));
    }));
    (0, globals_1.it)("should store and retrieve history", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const history = {
            id: "h1",
            action: "edit",
            timestamp: new Date(),
            userId: "u1",
            labels: [],
            historyIndex: 0,
            canUndo: true,
            canRedo: false,
        };
        yield dataAccess.updateHistory(history);
        const histories = yield dataAccess.getHistory();
        (0, globals_1.expect)(histories).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ id: "h1", action: "edit" }),
        ]));
    }));
    (0, globals_1.it)("should paginate images", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const project = {
            id: "p7",
            name: "P7",
            createdAt: new Date(),
            lastModified: new Date(),
            images: [],
        };
        yield dataAccess.createProject(project);
        for (let i = 0; i < 5; i++) {
            yield dataAccess.createImage({
                id: `img${i}`,
                name: `img${i}`,
                data: "",
                width: 1,
                height: 1,
                projectId: "p7",
                createdAt: new Date(),
            });
        }
        const paged = yield dataAccess.getImagesWithPagination("p7", 1, 2);
        (0, globals_1.expect)(paged.length).toBe(2);
    }));
    (0, globals_1.it)("should filter annotations", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const project = {
            id: "p8",
            name: "P8",
            createdAt: new Date(),
            lastModified: new Date(),
            images: [],
        };
        yield dataAccess.createProject(project);
        const image = {
            id: "img8",
            name: "img8",
            data: "",
            width: 1,
            height: 1,
            projectId: "p8",
            createdAt: new Date(),
        };
        yield dataAccess.createImage(image);
        yield dataAccess.createAnnotation({
            id: "a8",
            imageId: "img8",
            labelId: "l8",
            name: "ann8",
            type: "box",
            coordinates: [],
            color: "red",
            isAIGenerated: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const filtered = yield dataAccess.getAnnotationsWithFilter("img8", {
            labelId: "l8",
        });
        (0, globals_1.expect)(filtered.length).toBe(1);
    }));
    (0, globals_1.it)("should get next and previous image ids", () => __awaiter(void 0, void 0, void 0, function* () {
        const dataAccess = new DexieDataAccess_1.DexieDataAccess();
        const project = {
            id: "p9",
            name: "P9",
            createdAt: new Date(),
            lastModified: new Date(),
            images: [],
        };
        yield dataAccess.createProject(project);
        yield dataAccess.createImage({
            id: "imgA",
            name: "A",
            data: "",
            width: 1,
            height: 1,
            projectId: "p9",
            createdAt: new Date(),
        });
        yield dataAccess.createImage({
            id: "imgB",
            name: "B",
            data: "",
            width: 1,
            height: 1,
            projectId: "p9",
            createdAt: new Date(),
        });
        const next = yield dataAccess.getNextImageId("imgA");
        const prev = yield dataAccess.getPreviousImageId("imgB");
        (0, globals_1.expect)(next).toBe("imgB");
        (0, globals_1.expect)(prev).toBe("imgA");
    }));
});
