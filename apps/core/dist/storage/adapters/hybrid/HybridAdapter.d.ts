/// <reference types="node" />
/// <reference types="node" />
import { AIModel } from "@vailabel/core/models/types";
import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class HybridAdapter implements IStorageAdapter {
    private readonly local;
    private readonly remote;
    constructor(local: IStorageAdapter, remote: IStorageAdapter);
    uploadModel(file: File): Promise<AIModel>;
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
