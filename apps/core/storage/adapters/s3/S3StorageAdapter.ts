import { IStorageAdapter } from "@vai/core/storage/interfaces/IStorageAdapter"
import { S3 } from "aws-sdk"

export class S3StorageAdapter implements IStorageAdapter {
  constructor(
    private bucket: string,
    private s3: S3 = new S3()
  ) {}

  async saveImage(id: string, data: Buffer): Promise<void> {
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: id,
        Body: data,
      })
      .promise()
  }

  async loadImage(id: string): Promise<Buffer> {
    const result = await this.s3
      .getObject({ Bucket: this.bucket, Key: id })
      .promise()
    return result.Body as Buffer
  }

  async deleteImage(id: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: this.bucket, Key: id }).promise()
  }

  async listImages(): Promise<string[]> {
    const result = await this.s3
      .listObjectsV2({ Bucket: this.bucket })
      .promise()
    return result.Contents?.map((obj) => obj.Key!) ?? []
  }
}
