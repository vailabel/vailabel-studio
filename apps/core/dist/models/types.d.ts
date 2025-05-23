export interface JsonData {
}
export interface Modal {
}
export interface Point extends JsonData {
    x: number;
    y: number;
}
export interface Label extends Modal {
    id: string;
    name: string;
    category?: string;
    isAIGenerated?: boolean;
    projectId: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Annotation extends Modal {
    id: string;
    labelId: string;
    label?: Label;
    name: string;
    type: "box" | "polygon" | "freeDraw";
    coordinates: Point[];
    imageId: string;
    createdAt: Date;
    updatedAt: Date;
    color?: string;
    isAIGenerated?: boolean;
}
export interface History extends Modal {
    id: string;
    labels: Label[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
}
export interface ImageData extends Modal {
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
    url?: string;
    projectId: string;
    createdAt: Date;
}
export interface Project extends Modal {
    id: string;
    name: string;
    images?: ImageData[];
    createdAt: Date;
    lastModified: Date;
}
export interface ExportFormat extends Modal {
    id: string;
    name: string;
    description: string;
    extension: string;
}
export interface AIModel extends Modal {
    id: string;
    name: string;
    description: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    modelPath: string;
    configPath: string;
    modelSize: number;
    isCustom: boolean;
}
export interface Settings {
    id: string;
    key: string;
    value: string;
}
