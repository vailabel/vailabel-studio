import { IStorageAdapter } from "@vailabel/core/src/storage/interfaces/IStorageAdapter";
export declare class S3StorageAdapter implements IStorageAdapter {
    private readonly bucket;
    private readonly region;
    private readonly identityPoolId;
    private readonly s3;
    constructor(bucket: string, region: string, identityPoolId: string);
    saveImage(id: string, data: Buffer): Promise<void>;
    loadImage(id: string): Promise<Buffer>;
    deleteImage(id: string): Promise<void>;
    listImages(): Promise<string[]>;
}
