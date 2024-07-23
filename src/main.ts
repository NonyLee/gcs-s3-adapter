import { Storage } from "./storage";
import { File } from "./file";
import { Writable, Readable }  from "stream"

import { Storage as GStorage, GetSignedUrlConfig, File as GFile } from "@google-cloud/storage";

const storage = new Storage()
// const stream = storage.bucket("test").file("1/2/3/123.txt").createReadStream()
// stream.pipe(process.stdout)