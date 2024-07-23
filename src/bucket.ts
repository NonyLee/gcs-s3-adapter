import * as Minio from 'minio'
import { File } from "./file";

export type GetFilesResponse = [
    File[],
    unknown
];

export interface S3FileOptions {

}



export class Bucket {
    private minioClient: Minio.Client
    bucketName: string
    baseUrl: string
    constructor(baseUrl: string, minioClient:  Minio.Client, name: string) {
        this.baseUrl = baseUrl
        this.minioClient = minioClient
        this.bucketName = name
    }
    file(name: string, _options?: S3FileOptions): File {
        return new File(this.baseUrl + "/" + this.bucketName, this.minioClient, this, name)
    }

    async getFiles(options?: {prefix?: string, maxResults: number}): Promise<GetFilesResponse> {
        return await new Promise((resolve, reject) => {
            const stream = this.minioClient.listObjects(this.bucketName, options?.prefix)
            const files: File[] = []
            stream.on("data", async (obj) => {
                if (!obj.name) return
                const file = new File(this.baseUrl + "/" + this.bucketName, this.minioClient, this, obj.name || "")
                files.push(file)

            })
            stream.on('end', () => {
                resolve([
                    files,
                    undefined
                ])
            })
            stream.on('error', function (err) {
                reject(err)
            })
        })
    }

    async create() {
        const exists = await this.minioClient.bucketExists(this.bucketName)
        if (!exists) {
            await this.minioClient.makeBucket(this.bucketName, 'us-east-1')
        }
    }
}