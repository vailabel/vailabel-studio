import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class HybridAdapter implements IStorageAdapter {
    private local;
    private remote;
    constructor(local: IStorageAdapter, remote: IStorageAdapter);
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
