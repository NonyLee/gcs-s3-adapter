import * as Minio from 'minio'
import { Bucket } from "./bucket";
import { AsyncReadable } from './asyncReadable';

import { Stream } from "stream"
import { WriteStreamPipe } from './asyncWriteable';
import { hashBinary } from './util';

export type SaveData =  Buffer | string;
export type IsPublicResponse = [boolean];
export type SignerGetSignedUrlResponse = string;
export type GetSignedUrlResponse = [SignerGetSignedUrlResponse];

export interface S3SaveOptions {
    contentType?: string;
}

export interface GetSignedUrlConfig {
    action: 'read' | 'write' | 'delete' | 'resumable';
    version?: 'v2' | 'v4';
    expires: string | number | Date;
}

export interface S3FileMeta {
    md5Hash?: string;
}

export class File {
    private minioClient: Minio.Client
    private bucket: Bucket
    private filePath: string
    private baseUrl: string

    constructor(baseUrl: string, minioClient:  Minio.Client, bucket: Bucket, filePath: string) {
        this.baseUrl = baseUrl
        this.minioClient = minioClient
        this.bucket = bucket
        this.filePath = filePath
    }

    get name(): string {
        return this.filePath
    }

    publicUrl(): string {
        return this.baseUrl + "/" + this.filePath
    }

    async isPublic(): Promise<IsPublicResponse> {
        return [true]
    }

    async getSignedUrl(_cfg: GetSignedUrlConfig): Promise<GetSignedUrlResponse> {
        return [this.publicUrl()]
    }

    async save(data: SaveData, _options?: S3SaveOptions): Promise<void> {
        await this.bucket.create()
        const md5 = hashBinary(data)
        await this.minioClient.putObject(this.bucket.bucketName,
            this.filePath, data, data.length, {
                "content-md5": md5,
                "content-type": _options?.contentType
            })
    }

    async getMetadata(): Promise<[S3FileMeta]> {
        const stats = await this.minioClient.statObject(this.bucket.bucketName,
            this.filePath)

        return [
            {md5Hash: stats.metaData["content-md5"]}
        ]
    }

    createReadStream(): Stream {
        return new AsyncReadable(this.minioClient, this.bucket, this.filePath)
    }

    /** for text-to-speech */

    createWriteStream(_options?: {resumable?: boolean, contentType?: string;}): Stream {
        // throw Error("undefined function")
        const pipe = new WriteStreamPipe(this.minioClient, this.bucket, this.filePath)

        return pipe.writer
    }

    async exists(): Promise<[boolean]> {
        try {
            await this.getMetadata()
        } catch {
            return [false]
        }
        return [true]
    }

    async download(): Promise<[Buffer]> {
        const stream = await this.minioClient.getObject(this.bucket.bucketName, this.filePath)
        return new Promise((resolve, reject) => {
            let chunks: Buffer[] = []
            stream.on('data', (chunk) => {
                chunks.push(chunk)
            })
            stream.on('end', () => {
                resolve([Buffer.concat(chunks)])
            })
            stream.on('error', (err) => {
                reject(err)
            })
        })
    }
}