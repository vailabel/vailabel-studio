import Dexie, { type Table } from "dexie";
import type { Label, Project, ImageData, Annotation, History, AIModel } from "../../models/types";
export declare class VisionDatabase extends Dexie {
    projects: Table<Project>;
    images: Table<ImageData>;
    labels: Table<Label>;
    annotations: Table<Annotation>;
    history: Table<History>;
    settings: Table<{
        key: string;
        value: string;
    }>;
    aiModels: Table<AIModel>;
    constructor();
}
export declare const db: VisionDatabase;
