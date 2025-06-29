import { Model } from "sequelize-typescript";
export declare class Point extends Model {
    x: number;
    y: number;
}
export declare class Project extends Model {
    id: string;
    name: string;
    labels: Label[];
    images: ImageData[];
    tasks: Task[];
    createdAt: Date;
    lastModified: Date;
}
export declare class Label extends Model {
    id: string;
    name: string;
    category?: string;
    isAIGenerated?: boolean;
    projectId: string;
    project: Project;
    annotations: Annotation[];
    color: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ImageData extends Model {
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
    url?: string;
    projectId: string;
    project: Project;
    annotations: Annotation[];
    createdAt: Date;
}
export declare class Annotation extends Model {
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
    createdAt: Date;
    updatedAt: Date;
    color?: string;
    isAIGenerated?: boolean;
}
export declare class History extends Model {
    id: string;
    labels: Label[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
}
export declare class Task extends Model {
    id: string;
    name: string;
    description: string;
    projectId: string;
    project: Project;
    assignedTo?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    dueDate?: Date;
    labels?: Label[];
    annotations?: Annotation[];
}
export declare class ExportFormat extends Model {
    id: string;
    name: string;
    description: string;
    extension: string;
}
export declare class AIModel extends Model {
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
export declare class Settings extends Model {
    id: string;
    key: string;
    value: string;
}
