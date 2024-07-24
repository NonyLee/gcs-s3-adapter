import { Bucket } from "./bucket"

import {Client} from 'minio'

export interface S3StorageOptions {
    keyFilename: string
}

export interface S3BucketOptions {

}

const s3Host = process.env["S3_HOST"] || "localhost"
const s3Port = process.env["S3_PORT"] || "8333"
const s3SSL = process.env["S3_SSL"] || "false"
const s3AccessKey = process.env["S3_ACCESS_KEY"] || ""
const s3SecretKey = process.env["S3_SECRET_KEY"] || ""

export class Storage {
    minioClient:  Client
    host: string = s3Host
    useSSL = s3SSL == "true"
    port = parseInt(s3Port)
    constructor(_options?: S3StorageOptions) {
        // skip options
        this.minioClient = new Client({
            endPoint: this.host,
            port: this.port,
            useSSL: this.useSSL,
            accessKey: s3AccessKey,
            secretKey: s3SecretKey,
            region: "us-east-1"
        })
        this.minioClient.enableSHA256 = false
    }

    get url(): string {
        return (this.useSSL ? "https://" : "http://")
                    + this.host + ":"
                    + this.port
    }

    bucket(name: string, _options?: S3BucketOptions): Bucket {
        return new Bucket(this.url, this.minioClient, name)
    }
}