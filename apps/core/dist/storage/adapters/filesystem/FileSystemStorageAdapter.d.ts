import { IStorageAdapter } from "@vailabel/core/src/storage";
export declare class FileSystemStorageAdapter implements IStorageAdapter {
    private readonly directory;
    constructor(directory: string);
    private ensureDirectory;
    private getPath;
    saveImage: (id: string, data: Buffer) => Promise<void>;
    loadImage: (id: string) => Promise<Buffer>;
    deleteImage: (id: string) => Promise<void>;
    listImages: () => Promise<string[]>;
}
