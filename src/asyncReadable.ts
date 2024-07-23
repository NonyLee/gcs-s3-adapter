import {Readable}  from "stream"
import * as Minio from 'minio'
import { Bucket } from "./bucket";

export class AsyncReadable extends Readable {
    private minioClient: Minio.Client
    private bucket: Bucket
    private filePath: string

    private reader?: Readable

    constructor(minioClient:  Minio.Client, bucket: Bucket, filePath: string) {
        super();

        this.minioClient = minioClient
        this.bucket = bucket
        this.filePath = filePath
    }

    async _read() {
        if (!this.reader) {
            this.reader = await this.minioClient.getObject(this.bucket.bucketName, this.filePath)
        }
        const data = this.reader?.read()
        this.push(data)
    }
}
