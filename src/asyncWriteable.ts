import { Writable }  from "stream"
import * as Minio from 'minio'
import { Bucket } from "./bucket";
import { hashBinary } from "./util";

class BridgeWritable extends Writable {
    buffers: Buffer[] = []
    constructor() {
        super();

        // this.dest = dest
        // this.minioClient = minioClient
        // this.bucket = bucket
        // this.filePath = filePath
    }

    get buffer(): Buffer {
        return Buffer.concat(this.buffers)
    }

    _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        // this.dest.write(chunk)
        this.buffers.push(chunk)
        callback()
    }
}

// class TargetReadable extends Readable {
//     constructor() {
//         super()
//     }
//     _read(size: number): void {
        
//     }

//     write(data: any) {
//         this.push(data)
//     }
// }

export class WriteStreamPipe {
    private minioClient: Minio.Client
    private bucket: Bucket
    private filePath: string

    private contentType?: string

    writer: BridgeWritable
    // reader: TargetReadable
    constructor(minioClient:  Minio.Client, bucket: Bucket, filePath: string, contentType?: string) {
        // this.reader = new TargetReadable
        this.writer = new BridgeWritable()

        this.contentType = contentType

        this.minioClient = minioClient
        this.bucket = bucket
        this.filePath = filePath

        this.init()
    }

    init() {
        // this.writer.on("end", () => {
        //     this.reader.write(null)
        // })
        this.writer.on("close", async () => {
            // this.reader.write(null)
            const buffer = this.writer.buffer
            const md5 = hashBinary(buffer)
            let meta: Minio.ItemBucketMetadata = {
                "Content-MD5": md5
            }
            if (this.contentType) {
                meta["content-type"] = this.contentType
            }
            await this.minioClient.putObject(this.bucket.bucketName, this.filePath, buffer, buffer.length, meta)
        })
    } 
}

// export class TestReadable extends Readable {
//     datas: any[] = []
//     constructor() {
//         super();

//         // this.minioClient = minioClient
//         // this.bucket = bucket
//         // this.filePath = filePath

//     }

//     _read(size: number): void {
//         console.log("read...........")
//         if (this.datas.length > 0)
//         this.push(this.datas.shift())
//     }

//     write(data: any) {
//         console.log("write...........")
//         this.push(data)
//         // this.datas.push(data)
//     }
// }
