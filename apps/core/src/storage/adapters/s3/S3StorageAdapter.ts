import { IStorageAdapter } from "@vailabel/core/src/storage/interfaces/IStorageAdapter"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity"

export class S3StorageAdapter implements IStorageAdapter {
  private readonly s3: S3Client
  constructor(
    private readonly bucket: string,
    private readonly region: string,
    private readonly identityPoolId: string
  ) {
    this.s3 = new S3Client({
      region: this.region,
      credentials: fromCognitoIdentityPool({
        identityPoolId: this.identityPoolId,
        clientConfig: { region: this.region },
      }),
      // Fix for Vite/webpack/browser: avoid process polyfill error
      ...(typeof window !== "undefined" ? { runtime: "browser" } : {}),
    })
  }
  async saveImage(id: string, data: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: id,
        Body: data,
      })
    )
  }

  async loadImage(id: string): Promise<Buffer> {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: id })
    )
    // result.Body is a stream, so we need to convert it to Buffer
    const stream = result.Body as ReadableStream<Uint8Array>
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let done = false
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      if (value) chunks.push(value)
      done = doneReading
    }
    return Buffer.concat(chunks)
  }

  async deleteImage(id: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: id })
    )
  }

  async listImages(): Promise<string[]> {
    const result = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.bucket })
    )
    return result.Contents?.map((obj) => obj.Key!) ?? []
  }
}
