import Dexie, { type Table } from "dexie";
import type { Label, Project, ImageData, Annotation, History } from "../../models/types";
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
    constructor();
}
export declare const db: VisionDatabase;
