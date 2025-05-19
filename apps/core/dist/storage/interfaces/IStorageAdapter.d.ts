/// <reference types="node" />
/// <reference types="node" />
import { AIModel } from "@vailabel/core/models/types";
export interface IStorageAdapter {
    saveImage(id: string, data: string | Buffer): Promise<void>;
    loadImage(id: string): Promise<string | Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
    uploadModel(file: File): Promise<AIModel>;
}
