/// <reference types="node" />
/// <reference types="node" />
import { ContainerClient } from "@azure/storage-blob";
import { AIModel } from "@vailabel/core/models/types";
import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class AzureBlobStorageAdapter implements IStorageAdapter {
    private readonly containerClient;
    constructor(containerClient: ContainerClient);
    uploadModel(file: File): Promise<AIModel>;
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
