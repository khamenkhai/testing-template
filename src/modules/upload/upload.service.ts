/* eslint-disable @typescript-eslint/require-await */
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly s3client: S3Client;
  private readonly logger = new Logger(UploadService.name);
  private readonly isMinIO: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isMinIO = this.configService.get('STORAGE_PROVIDER') === 'minio';

    const s3Config: any = {
      region: this.configService.getOrThrow('AWS_S3_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    };

    // MinIO specific configuration
    if (this.isMinIO) {
      s3Config.endpoint = this.configService.getOrThrow('MINIO_ENDPOINT');
      s3Config.forcePathStyle = true;

      // You might want to set a default region or use 'us-east-1'
      if (!this.configService.get('AWS_S3_REGION')) {
        s3Config.region = 'us-east-1';
      }
    }

    this.s3client = new S3Client(s3Config);
  }

  async uploadFile(
    fileName: string,
    file: Buffer | Uint8Array | Readable,
    contentType: string,
  ): Promise<{ key: string }> {
    const bucket = this.configService.getOrThrow('AWS_S3_BUCKET');
    const key = `${Date.now()}-${fileName}`;

    const upload = new Upload({
      client: this.s3client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      },
    });

    await upload.done();
    return { key };
  }

  async getPresignedUrl(key: string): Promise<string> {
    if (!key) {
      return '';
    }

    const bucket = this.configService.getOrThrow('AWS_S3_BUCKET');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // MinIO might need different presigned URL handling
    const expiresIn = this.isMinIO ? 604800 : 3600; // 7 days for MinIO, 1 hour for S3

    try {
      return await getSignedUrl(this.s3client, command, { expiresIn });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate presigned URL for ${key}: ${error.message}`,
      );

      // Fallback for MinIO: construct URL manually if presigned URL fails
      if (this.isMinIO) {
        const endpoint = this.configService.get('MINIO_ENDPOINT');
        return `${endpoint}/${bucket}/${key}`;
      }
      throw error;
    }
  }

  async getPublicUrl(key: string): Promise<string> {
    if (!key) {
      return '';
    }

    const bucket = this.configService.getOrThrow('AWS_S3_BUCKET');

    if (this.isMinIO) {
      const endpoint = this.configService.get('MINIO_ENDPOINT');
      return `${endpoint}/${bucket}/${key}`;
    } else {
      // For S3, you might want to return the regional endpoint or use presigned URL
      const region = this.configService.get('AWS_S3_REGION');
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }

    const bucket = this.configService.getOrThrow('AWS_S3_BUCKET');

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3client.send(command);
      this.logger.log(
        `Successfully deleted file: ${key} from ${this.isMinIO ? 'MinIO' : 'S3'}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`);
      throw error;
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  async updateFile(
    oldKey: string,
    fileName: string,
    file: Buffer | Uint8Array | Readable,
    contentType: string,
  ): Promise<{ key: string }> {
    // Delete the old file first
    if (oldKey) {
      await this.deleteFile(oldKey);
    }

    // Upload the new file
    return await this.uploadFile(fileName, file, contentType);
  }

  async fileExists(key: string): Promise<boolean> {
    if (!key) {
      return false;
    }

    const bucket = this.configService.getOrThrow('AWS_S3_BUCKET');

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  getStorageType(): string {
    return this.isMinIO ? 'minio' : 's3';
  }
}
