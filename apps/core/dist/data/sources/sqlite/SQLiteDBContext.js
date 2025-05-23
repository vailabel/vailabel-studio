"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDBContext = void 0;
const AIModelDataAccess_1 = require("./AIModelDataAccess");
const AnnotationDataAccess_1 = require("./AnnotationDataAccess");
const HistoryDataAccess_1 = require("./HistoryDataAccess");
const ImageDataAccess_1 = require("./ImageDataAccess");
const LabelDataAccess_1 = require("./LabelDataAccess");
const ProjectDataAccess_1 = require("./ProjectDataAccess");
const SettingsDataAccess_1 = require("./SettingsDataAccess");
class SQLiteDBContext {
    constructor() {
        this.projects = new ProjectDataAccess_1.ProjectDataAccess();
        this.images = new ImageDataAccess_1.ImageDataAccess();
        this.aiModels = new AIModelDataAccess_1.AIModelDataAccess();
        this.annotations = new AnnotationDataAccess_1.AnnotationDataAccess();
        this.labels = new LabelDataAccess_1.LabelDataAccess();
        this.settings = new SettingsDataAccess_1.SettingsDataAccess();
        this.history = new HistoryDataAccess_1.HistoryDataAccess();
    }
}
exports.SQLiteDBContext = SQLiteDBContext;
