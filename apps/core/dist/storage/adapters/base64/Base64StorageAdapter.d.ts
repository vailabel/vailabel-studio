import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class Base64StorageAdapter implements IStorageAdapter {
    private prefix;
    saveImage(id: string, data: string): Promise<void>;
    loadImage(id: string): Promise<string>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
