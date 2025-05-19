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
const SQLiteDataAccess_1 = require("./SQLiteDataAccess");
global.window = Object.create(window);
window.ipc = {
    invoke: globals_1.jest.fn(),
};
(0, globals_1.describe)("SQLiteDataAccess", () => {
    let adapter;
    let mockInvoke;
    (0, globals_1.beforeEach)(() => {
        mockInvoke = window.ipc.invoke;
        mockInvoke.mockReset();
        adapter = new SQLiteDataAccess_1.SQLiteDataAccess();
    });
    (0, globals_1.it)("should be defined", () => {
        (0, globals_1.expect)(SQLiteDataAccess_1.SQLiteDataAccess).toBeDefined();
    });
    (0, globals_1.it)("getProjectWithImages returns project with images", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke
            .mockResolvedValueOnce({ id: "p1", name: "proj" }) // for project
            .mockResolvedValueOnce([{ id: "img1" }, { id: "img2" }]); // for images
        // Act
        const result = yield adapter.getProjectWithImages("p1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
            "SELECT * FROM projects WHERE id = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM images WHERE projectId = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(result).toEqual({
            id: "p1",
            name: "proj",
            images: [{ id: "img1" }, { id: "img2" }],
        });
    }));
    (0, globals_1.it)("getProjectWithImages returns undefined if no project", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce(undefined);
        // Act
        const result = yield adapter.getProjectWithImages("p1");
        // Assert
        (0, globals_1.expect)(result).toBeUndefined();
    }));
    (0, globals_1.it)("getProjectById returns project", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce({ id: "p1" });
        // Act
        const result = yield adapter.getProjectById("p1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
            "SELECT * FROM projects WHERE id = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(result).toEqual({ id: "p1" });
    }));
    (0, globals_1.it)("createProject calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const project = { id: "p1", name: "n", createdAt: 1, lastModified: 2 };
        // Act
        yield adapter.createProject(project);
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "INSERT INTO projects (id, name, createdAt, lastModified) VALUES (?, ?, ?, ?)",
            [project.id, project.name, project.createdAt, project.lastModified],
        ]);
    }));
    (0, globals_1.it)("updateProject calls sqlite:run with correct SQL", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.updateProject("p1", { name: "new" });
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "UPDATE projects SET name = ? WHERE id = ?",
            ["new", "p1"],
        ]);
    }));
    (0, globals_1.it)("deleteProject deletes annotations, images, labels, and project", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke
            .mockResolvedValueOnce([{ id: "img1" }, { id: "img2" }]) // images
            .mockResolvedValue(undefined);
        // Act
        yield adapter.deleteProject("p1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT id FROM images WHERE projectId = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM annotations WHERE imageId IN (?,?)",
            ["img1", "img2"],
        ]);
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM images WHERE projectId = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM labels WHERE projectId = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM projects WHERE id = ?",
            ["p1"],
        ]);
    }));
    (0, globals_1.it)("getImages returns images", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ id: "img1" }]);
        // Act
        const result = yield adapter.getImages("p1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM images WHERE projectId = ?",
            ["p1"],
        ]);
        (0, globals_1.expect)(result).toEqual([{ id: "img1" }]);
    }));
    (0, globals_1.it)("getImagesWithPagination returns images", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ id: "img1" }]);
        // Act
        const result = yield adapter.getImagesWithPagination("p1", 10, 5);
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM images WHERE projectId = ? LIMIT ? OFFSET ?",
            ["p1", 5, 10],
        ]);
        (0, globals_1.expect)(result).toEqual([{ id: "img1" }]);
    }));
    (0, globals_1.it)("getNextImageId returns id or null", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce({ id: "img2" });
        // Act
        const result = yield adapter.getNextImageId("img1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
            "SELECT id FROM images WHERE id > ? ORDER BY id ASC LIMIT 1",
            ["img1"],
        ]);
        (0, globals_1.expect)(result).toBe("img2");
    }));
    (0, globals_1.it)("getNextImageId returns null if not found", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce(undefined);
        // Act
        const result = yield adapter.getNextImageId("img1");
        // Assert
        (0, globals_1.expect)(result).toBeNull();
    }));
    (0, globals_1.it)("getAnnotations parses coordinates if string", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([
            { id: "a", coordinates: JSON.stringify([1, 2]) },
            { id: "b", coordinates: [3, 4] },
        ]);
        // Act
        const result = yield adapter.getAnnotations("img1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM annotations WHERE imageId = ?",
            ["img1"],
        ]);
        (0, globals_1.expect)(result[0].coordinates).toEqual([1, 2]);
        (0, globals_1.expect)(result[1].coordinates).toEqual([3, 4]);
    }));
    (0, globals_1.it)("createAnnotation stringifies coordinates", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const annotation = {
            id: "a",
            imageId: "img1",
            labelId: "l1",
            name: "n",
            type: "rect",
            coordinates: [1, 2],
            color: "red",
            isAIGenerated: false,
            createdAt: 1,
            updatedAt: 2,
        };
        // Act
        yield adapter.createAnnotation(annotation);
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            globals_1.expect.stringContaining("INSERT INTO annotations"),
            globals_1.expect.arrayContaining([
                annotation.id,
                annotation.imageId,
                annotation.labelId,
                annotation.name,
                annotation.type,
                JSON.stringify(annotation.coordinates),
                annotation.color,
                annotation.isAIGenerated,
                annotation.createdAt,
                annotation.updatedAt,
            ]),
        ]);
    }));
    (0, globals_1.it)("updateAnnotation stringifies coordinates if present", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.updateAnnotation("a", {
            coordinates: [1, 2],
            name: "n",
        });
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            globals_1.expect.stringContaining("UPDATE annotations SET"),
            globals_1.expect.arrayContaining([JSON.stringify([1, 2]), "n", "a"]),
        ]);
    }));
    (0, globals_1.it)("deleteAnnotation calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.deleteAnnotation("a");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM annotations WHERE id = ?",
            ["a"],
        ]);
    }));
    (0, globals_1.it)("createLabel calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const label = {
            id: "l1",
            name: "label",
            category: "cat",
            isAIGenerated: false,
            projectId: "p1",
            color: "red",
            createdAt: 1,
            updatedAt: 2,
        };
        // Act
        yield adapter.createLabel(label);
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            globals_1.expect.stringContaining("INSERT INTO labels"),
            globals_1.expect.arrayContaining([
                label.id,
                label.name,
                label.category,
                label.isAIGenerated,
                label.projectId,
                label.color,
                label.createdAt,
                label.updatedAt,
            ]),
        ]);
    }));
    (0, globals_1.it)("getLabels returns labels", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ id: "l1" }]);
        // Act
        const result = yield adapter.getLabels();
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM labels",
            [],
        ]);
        (0, globals_1.expect)(result).toEqual([{ id: "l1" }]);
    }));
    (0, globals_1.it)("getLabelById returns label", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce({ id: "l1" });
        // Act
        const result = yield adapter.getLabelById("l1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:get", [
            "SELECT * FROM labels WHERE id = ?",
            ["l1"],
        ]);
        (0, globals_1.expect)(result).toEqual({ id: "l1" });
    }));
    (0, globals_1.it)("updateLabel calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.updateLabel("l1", { name: "new" });
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "UPDATE labels SET name = ? WHERE id = ?",
            ["new", "l1"],
        ]);
    }));
    (0, globals_1.it)("deleteLabel calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.deleteLabel("l1");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "DELETE FROM labels WHERE id = ?",
            ["l1"],
        ]);
    }));
    (0, globals_1.it)("getSettings returns settings", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ key: "a", value: "b" }]);
        // Act
        const result = yield adapter.getSettings();
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM settings",
            [],
        ]);
        (0, globals_1.expect)(result).toEqual([{ key: "a", value: "b" }]);
    }));
    (0, globals_1.it)("updateSetting calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        // Act
        yield adapter.updateSetting("k", "v");
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            "UPDATE settings SET value = ? WHERE key = ?",
            ["v", "k"],
        ]);
    }));
    (0, globals_1.it)("getHistory returns history", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ id: "h1" }]);
        // Act
        const result = yield adapter.getHistory();
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM history",
            [],
        ]);
        (0, globals_1.expect)(result).toEqual([{ id: "h1" }]);
    }));
    (0, globals_1.it)("updateHistory calls sqlite:run", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const history = { id: "h1", foo: "bar" };
        // Act
        yield adapter.updateHistory(history);
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:run", [
            globals_1.expect.stringContaining("UPDATE history SET"),
            globals_1.expect.arrayContaining(["bar", "h1"]),
        ]);
    }));
    (0, globals_1.it)("getProjects returns projects", () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        ;
        mockInvoke.mockResolvedValueOnce([{ id: "p1" }]);
        // Act
        const result = yield adapter.getProjects();
        // Assert
        (0, globals_1.expect)(mockInvoke).toHaveBeenCalledWith("sqlite:all", [
            "SELECT * FROM projects",
            [],
        ]);
        (0, globals_1.expect)(result).toEqual([{ id: "p1" }]);
    }));
});
