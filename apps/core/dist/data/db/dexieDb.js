"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.VisionDatabase = void 0;
const dexie_1 = __importDefault(require("dexie"));
class VisionDatabase extends dexie_1.default {
    constructor() {
        super("vision-ai-label-studio");
        this.version(1).stores({
            projects: "id, name, createdAt, lastModified",
            images: "id, name, projectId, createdAt",
            labels: "id, name, category, projectId, color, isAIGenerated",
            settings: "key, value",
            annotations: "id, name, type, coordinates, imageId, createdAt",
            history: "id, labels, historyIndex, canUndo, canRedo",
        });
    }
}
exports.VisionDatabase = VisionDatabase;
exports.db = new VisionDatabase();
