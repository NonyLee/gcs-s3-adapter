# gs-s3-adapter

中文 | [English](README.md) 

基于minio-js实现的google/storage部分接口。主要用于Omnivore的私有部署场景，用来替换项目中使用的@google-cloud/storage包，从而尽可能避免修改代码直接部署使用。

## 使用

需要修改Omnivore项目的packages/api/Dockerfile和packages/content-fetch/Dockerfile文件，此处以api为例

1. 打开packages/api/Dockerfile文件

2. 找到：

```Dockerfile
RUN yarn install --pure-lockfile --production
```

3. 在这之后添加替换代码

```Dockerfile
RUN yarn install --pure-lockfile --production

# Replace @google-cloud/storage with gcs-s3-adapter
RUN yarn add --ignore-workspace-root-check gcs-s3-adapter
RUN rm -rf /app/node_modules/@google-cloud/storage
RUN ln -s /app/node_modules/gcs-s3-adapter /app/node_modules/@google-cloud/storage
```

3. 修改docker-compose.yml，添加S3相关环境变量

```yaml
environment:
    - S3_HOST=192.168.x.x
    - S3_PORT=xxxx
    # optional
    - S3_ACCESS_KEY=xxx
    - S3_SECRET_KEY=xxx
    ...
```

4. 构建并启动

```bash
docker-compose build api
docker-compose up -d
```
content-fetch与此类似

## 其它相关问题

存储问题解决后依然还有一些其它的问题需要，有的必须要处理，有的则是可选项

#### message queue（必须）

content-fetch服务在抓取内容结束后，通过queue通知api服务。api服务需要启动一个queue processor来处理content-fetch的返回，否则会一直block。目前已知的方式有两种：

- 修改packages/api/server.ts

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

- 修改docker-compose.yml，添加新的服务，配置与api基本一致，增加command参数

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

请注意：此方法未测试，请自行修改尝试

最后，以上两种方式，都需要添加redis相关的环境变量：

```yaml
services:
    ...
    api:
        environment:
            - REDIS_URL=redis://redis:6379
```

#### image proxy（可选）

默认，docker-compose里是没有部署image proxy的，如需要相关功能需要自行添加部署：

```yaml
services:
    imageproxy:
        build:
            context: ./imageproxy
            dockerfile: ./Dockerfile
        container_name: "omnivore-image-proxy"
        ports:
            - "4001:8080"
        environment:
            - AWS_ACCESS_KEY_ID=xxx
            - AWS_SECRET_KEY=xxxx
            - IMAGE_PROXY_SECRET=some-secret
            - MEM_CACHE_SIZE_MB=100
            - GCS_IMAGES_PATH=s3://fake-region/omnivore-image/imgs?endpoint=<ip>:<port>&disableSSL=1&s3ForcePathStyle=1
```
请注意，AWS_ACCESS_KEY_ID与AWS_SECRET_KEY必须赋值，即使你的S3无加密。

#### Starting puppeteer browser

启动puppeteer时会一直卡在这里，或者报个连接错误。

原因是puppeteer-extra-plugin-adblocker会在启动时到Github上下载一个list文件，因为众所周知的原因需要特殊处理一下。

目前没有找到特别好的办法，采用修改hosts方式，重新映射Github IP来解决的。

如果有更好的办法，希望不吝赐教。

#### PDF未测试

#### text-to-speech未测试