# gcs-s3-adapter

English | [中文](README_cn.md)

gcs-s3-adapter is a library for self-hosting Omnivore. It implements a part of the GCS APIs with minio-js. It will replace @google-cloud/storage when the docker image is being built.

## How to use it

You must change the packages/api/Dockerfile and packages/content-fetch/Dockerfile files. Here, we'll use the API as an example:

1. Edit packages/api/Dockerfile

2. Find:

```Dockerfile
RUN yarn install --pure-lockfile --production
```

3. Add codes to replace @google-cloud/storage

```Dockerfile
RUN yarn install --pure-lockfile --production

# Replace @google-cloud/storage with gcs-s3-adapter
RUN yarn add --ignore-workspace-root-check gcs-s3-adapter
RUN rm -rf /app/node_modules/@google-cloud/storage
RUN ln -s /app/node_modules/gcs-s3-adapter /app/node_modules/@google-cloud/storage
```

3. Edit docker-compose.yml to cofigure S3 paramaters

```yaml
environment:
    # S3 paramaters
    - S3_HOST=<ip>
    - S3_PORT=<port>
    # optional
    - S3_ACCESS_KEY=xxx
    - S3_SECRET_KEY=xxx
    ...
```

4. Build & run

```bash
docker-compose build api
docker-compose up -d
```

The content-fetch process is similar to this.

## Other issues

#### message queue (Mandatory)

The content-fetch service will return the response to the API service via a message queue. Thus, the API service must start a queue processor to handle it. There are two approaches:

- Edit packages/api/server.ts (this works for me)

```typescript
...
import { createWorker } from './queue-processor'
...
const main = async (): Promise<void> => {
    ...
    // redis is optional for the API server
    if (env.redis.cache.url) {
        await redisDataSource.initialize()
    }

    // create queue processor
    let worker 
    if (redisDataSource.workerRedisClient) {
        worker = createWorker(redisDataSource.workerRedisClient)
    }
    ...
}
```

or

- Edit docker-compose.yml, start a new process for the queue processor (untested)

```yaml
services:
    ...
    queue:
        build:
            context: .
            dockerfile: ./packages/api/Dockerfile
        container_name: "omnivore-queue"
        command: ["yarn", "workspace", "@omnivore/api", "start_queue_processor"]
    ...
```

Note：I have not tested this.


Finally, configure Redis parameters for the message queue:

```yaml
services:
    ...
    api:
        environment:
            - REDIS_URL=redis://redis:6379
```

#### image proxy (optional)

docker-compose does not contain an image proxy by default. You must deploy it yourself if you need it.

```yaml
services:
    ...
    imageproxy:
        build:
            context: ./imageproxy
            dockerfile: ./Dockerfile
        container_name: "omnivore-image-proxy"
        ports:
            - "8080:8080"
        environment:
            - AWS_ACCESS_KEY_ID=xxx
            - AWS_SECRET_KEY=xxxx
            - IMAGE_PROXY_SECRET=some-secret
            - MEM_CACHE_SIZE_MB=100
            - GCS_IMAGES_PATH=s3://fake-region/omnivore-image/imgs?endpoint=<ip>:<port>&disableSSL=1&s3ForcePathStyle=1
```

Note: AWS_ACCESS_KEY_ID and AWS_SECRET_KEY must have a value, whether the S3 server needs it or not.

#### PDF (untested)

#### text-to-speech (untested)