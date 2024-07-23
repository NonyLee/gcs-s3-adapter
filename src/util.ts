import * as crypto from 'node:crypto'

export function hashBinary(buf: Buffer|string) {
    const md5sum = crypto.createHash('md5').update(buf).digest('base64')
  
    return md5sum
}