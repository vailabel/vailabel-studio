/// <reference types="node" />
/// <reference types="node" />
import { IStorageAdapter } from "@vailabel/core/src/storage/interfaces/IStorageAdapter";
import { AIModel } from "@vailabel/core/models/types";
export declare class S3StorageAdapter implements IStorageAdapter {
    private readonly bucket;
    private readonly region;
    private readonly identityPoolId;
    private readonly s3;
    constructor(bucket: string, region: string, identityPoolId: string);
    uploadModel(file: File): Promise<AIModel>;
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
