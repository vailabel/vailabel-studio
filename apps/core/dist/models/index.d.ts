export declare class Point {
    x: number;
    y: number;
}
export declare class Project {
    id: string;
    name: string;
    labels: Label[];
    images: ImageData[];
    tasks: Task[];
}
export declare class Label {
    id: string;
    name: string;
    category?: string;
    isAIGenerated?: boolean;
    projectId: string;
    project: Project;
    annotations: Annotation[];
    color: string;
}
export declare class ImageData {
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
    url?: string;
    projectId: string;
    project: Project;
    annotations: Annotation[];
}
export declare class Annotation {
    id: string;
    labelId: string;
    label: Label;
    name: string;
    type: string;
    coordinates: {
        x: number;
        y: number;
    }[];
    imageId: string;
    image: ImageData;
    color?: string;
    isAIGenerated?: boolean;
}
export declare class History {
    id: string;
    labels: Label[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
}
export declare class Task {
    id: string;
    name: string;
    description: string;
    projectId: string;
    project: Project;
    assignedTo?: string;
    status: string;
    dueDate?: Date;
    labels?: Label[];
    annotations?: Annotation[];
}
export declare class ExportFormat {
    id: string;
    name: string;
    description: string;
    extension: string;
}
export declare class AIModel {
    id: string;
    name: string;
    description: string;
    version: string;
    modelPath: string;
    configPath: string;
    modelSize: number;
    isCustom: boolean;
}
export declare class Settings {
    id: string;
    key: string;
    value: string;
}
export declare class User {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
}
