export interface Point {
    x: number;
    y: number;
}
export interface Label {
    id: string;
    name: string;
    category?: string;
    isAIGenerated?: boolean;
    projectId: string;
    color: string;
    confidence?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Annotation {
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
export interface History {
    id: string;
    labels: Label[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
}
export interface ImageData {
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
    url?: string;
    projectId: string;
    createdAt: Date;
}
export interface Project {
    id: string;
    name: string;
    images?: ImageData[];
    createdAt: Date;
    lastModified: Date;
}
export interface ExportFormat {
    id: string;
    name: string;
    description: string;
    extension: string;
}
export interface AIModel {
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
    key: string;
    value: string;
}
