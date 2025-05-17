/// <reference types="node" />
/// <reference types="node" />
import { IStorageAdapter } from "@vailabel/core/src/storage/interfaces/IStorageAdapter";
import { S3 } from "aws-sdk";
export declare class S3StorageAdapter implements IStorageAdapter {
    private bucket;
    private s3;
    constructor(bucket: string, s3?: S3);
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
