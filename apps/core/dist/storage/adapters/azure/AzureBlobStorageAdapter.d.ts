import { ContainerClient } from "@azure/storage-blob";
import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class AzureBlobStorageAdapter implements IStorageAdapter {
    private readonly containerClient;
    constructor(containerClient: ContainerClient);
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
