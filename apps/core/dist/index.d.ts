export declare class Point {
    x: number;
    y: number;
}
export declare class Project {
    id: string;
    name: string;
    description?: string;
    type: string;
    status: string;
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
    labels?: Label[];
    images?: ImageData[];
    tasks?: Task[];
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Label {
    id: string;
    name: string;
    description?: string;
    category?: string;
    isAIGenerated?: boolean;
    projectId?: string;
    project_id?: string;
    project?: Project;
    annotations?: Annotation[];
    color: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class ImageData {
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
    url?: string;
    projectId?: string;
    project_id?: string;
    project?: Project;
    annotations?: Annotation[];
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Annotation {
    id: string;
    labelId?: string;
    label_id?: string;
    label?: Label;
    name: string;
    type: string;
    coordinates: {
        x: number;
        y: number;
    }[];
    imageId?: string;
    image_id?: string;
    image?: ImageData;
    color?: string;
    isAIGenerated?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class History {
    id: string;
    labels?: Label[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    projectId?: string;
    project_id?: string;
    project?: Project;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Task {
    id: string;
    name: string;
    description: string;
    projectId?: string;
    project_id?: string;
    project?: Project;
    assignedTo?: string;
    assigned_to?: string;
    status: string;
    dueDate?: Date;
    due_date?: Date;
    labels?: Label[];
    annotations?: Annotation[];
    createdAt?: Date;
    updatedAt?: Date;
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
    type?: string;
    status?: string;
    category?: string;
    isActive?: boolean;
    lastUsed?: Date;
    modelMetadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Settings {
    id: string;
    key: string;
    value: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Permission {
    id: string;
    name: string;
    description?: string;
    resource: string;
    action: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Role {
    id: string;
    name: string;
    description?: string;
    permissions?: Permission[];
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class User {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    roleId?: string;
    roleObj?: Role;
    roles?: string[];
    permissions?: string[];
    userPermissions?: Permission[];
    token?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
