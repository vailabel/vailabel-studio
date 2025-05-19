/// <reference types="node" />
/// <reference types="node" />
export interface IStorageAdapter {
    saveImage(id: string, data: string | Buffer): Promise<void>;
    loadImage(id: string): Promise<string | Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
