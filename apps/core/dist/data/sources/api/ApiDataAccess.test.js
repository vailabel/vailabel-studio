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
const ApiDataAccess_1 = require("./ApiDataAccess");
const ApiClient_1 = require("@vailabel/core/src/data/sources/api/ApiClient");
jest.mock("@vailabel/core/src/data/sources/api/ApiClient");
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
ApiClient_1.ApiClient.mockImplementation(() => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
}));
describe("ApiDataAccess", () => {
    let dataAccess;
    let apiClientInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        apiClientInstance = {
            get: mockGet,
            post: mockPost,
            put: mockPut,
            delete: mockDelete,
        };
        dataAccess = new ApiDataAccess_1.ApiDataAccess(apiClientInstance);
        mockGet.mockResolvedValue(undefined);
        mockPost.mockResolvedValue(undefined);
        mockPut.mockResolvedValue(undefined);
        mockDelete.mockResolvedValue(undefined);
    });
    it("getProjectWithImages calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getProjectWithImages("1");
        expect(mockGet).toHaveBeenCalledWith("/projects/1");
    }));
    it("getNextImageId calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getNextImageId("img1");
        expect(mockGet).toHaveBeenCalledWith("/images/img1/next");
    }));
    it("deleteLabel calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.deleteLabel("label1");
        expect(mockDelete).toHaveBeenCalledWith("/labels/label1");
    }));
    it("createProject posts to correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const project = { id: "2", name: "New Project" };
        mockPost.mockResolvedValueOnce(undefined);
        yield dataAccess.createProject(project);
        expect(mockPost).toHaveBeenCalledWith("/projects", project);
    }));
    it("getAnnotationsWithFilter calls correct endpoint with query", () => __awaiter(void 0, void 0, void 0, function* () {
        const filter = { type: "box" };
        mockGet.mockResolvedValueOnce(undefined);
        yield dataAccess.getAnnotationsWithFilter("img1", filter);
        expect(mockGet).toHaveBeenCalledWith("/images/img1/annotations?type=box");
    }));
    it("createLabel posts label and updates annotations", () => __awaiter(void 0, void 0, void 0, function* () {
        const label = { id: "l1", name: "Label1" };
        const annotationIds = ["a1", "a2"];
        mockPost.mockResolvedValueOnce(undefined);
        mockPut.mockResolvedValue(undefined);
        yield dataAccess.createLabel(label, annotationIds);
        expect(mockPost).toHaveBeenCalledWith("/labels", label);
        expect(mockPut).toHaveBeenNthCalledWith(1, "/annotations/a1", {
            labelId: "l1",
        });
        expect(mockPut).toHaveBeenNthCalledWith(2, "/annotations/a2", {
            labelId: "l1",
        });
    }));
    it("updateProject calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const updates = { name: "Updated Project" };
        yield dataAccess.updateProject("1", updates);
        expect(mockPut).toHaveBeenCalledWith("/projects/1", updates);
    }));
    it("deleteProject calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.deleteProject("1");
        expect(mockDelete).toHaveBeenCalledWith("/projects/1");
    }));
    it("createImage posts to correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const image = { id: "img1", url: "url" };
        yield dataAccess.createImage(image);
        expect(mockPost).toHaveBeenCalledWith("/images", image);
    }));
    it("updateImage calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const updates = { url: "new-url" };
        yield dataAccess.updateImage("img1", updates);
        expect(mockPut).toHaveBeenCalledWith("/images/img1", updates);
    }));
    it("deleteImage calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.deleteImage("img1");
        expect(mockDelete).toHaveBeenCalledWith("/images/img1");
    }));
    it("createAnnotation posts to correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const annotation = { id: "a1", imageId: "img1" };
        yield dataAccess.createAnnotation(annotation);
        expect(mockPost).toHaveBeenCalledWith("/annotations", annotation);
    }));
    it("updateAnnotation calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const updates = { labelId: "l1" };
        yield dataAccess.updateAnnotation("a1", updates);
        expect(mockPut).toHaveBeenCalledWith("/annotations/a1", updates);
    }));
    it("deleteAnnotation calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.deleteAnnotation("a1");
        expect(mockDelete).toHaveBeenCalledWith("/annotations/a1");
    }));
    it("getSettings calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getSettings();
        expect(mockGet).toHaveBeenCalledWith("/settings");
    }));
    it("updateSetting calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.updateSetting("theme", "dark");
        expect(mockPut).toHaveBeenCalledWith("/settings/theme", { value: "dark" });
    }));
    it("getHistory calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getHistory();
        expect(mockGet).toHaveBeenCalledWith("/history");
    }));
    it("updateHistory calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const history = {
            id: "h1",
            labels: [],
            historyIndex: 0,
            canUndo: false,
            canRedo: false,
        };
        yield dataAccess.updateHistory(history);
        expect(mockPut).toHaveBeenCalledWith("/history", history);
    }));
    it("getImagesWithPagination calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getImagesWithPagination("p1", 10, 5);
        expect(mockGet).toHaveBeenCalledWith("/projects/p1/images?offset=10&limit=5");
    }));
    it("getLabels calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getLabels();
        expect(mockGet).toHaveBeenCalledWith("/labels");
    }));
    it("getLabelById calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getLabelById("l1");
        expect(mockGet).toHaveBeenCalledWith("/labels/l1");
    }));
    it("updateLabel calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        const updates = { name: "Updated Label" };
        yield dataAccess.updateLabel("l1", updates);
        expect(mockPut).toHaveBeenCalledWith("/labels/l1", updates);
    }));
    it("getPreviousImageId calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getPreviousImageId("img1");
        expect(mockGet).toHaveBeenCalledWith("/images/img1/previous");
    }));
    it("getProjects calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getProjects();
        expect(mockGet).toHaveBeenCalledWith("/projects");
    }));
    it("getProjectById calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getProjectById("1");
        expect(mockGet).toHaveBeenCalledWith("/projects/1");
    }));
    it("getImages calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getImages("p1");
        expect(mockGet).toHaveBeenCalledWith("/projects/p1/images");
    }));
    it("getAnnotations calls correct endpoint", () => __awaiter(void 0, void 0, void 0, function* () {
        yield dataAccess.getAnnotations("img1");
        expect(mockGet).toHaveBeenCalledWith("/images/img1/annotations");
    }));
});
