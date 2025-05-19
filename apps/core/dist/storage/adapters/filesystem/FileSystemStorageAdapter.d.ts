/// <reference types="node" />
/// <reference types="node" />
import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class FileSystemStorageAdapter implements IStorageAdapter {
    private directory;
    constructor(directory: string);
    private getPath;
    saveImage: (id: string, data: Buffer) => Promise<void>;
    loadImage: (id: string) => Promise<Buffer>;
    deleteImage: (id: string) => Promise<void>;
    listImages: () => Promise<string[]>;
}
