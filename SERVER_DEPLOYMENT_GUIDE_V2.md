# PixelDesk 服务器部署指南 (2026.01 更新)

本文档整理了在对 **Prisma Workstation ID** 进行架构调整及执行大批量数据迁移脚本后的服务器部署流程。

## ⚠️ 部署前必须执行：数据库备份

在进行任何破坏性操作（如架构修改或数据迁移）前，请务必备份生产环境数据库。

```bash
# 假设使用 Docker 部署
docker exec -t [DB_CONTAINER_NAME] pg_dump -U pixel_user pixeldesk > pixeldesk_backup_$(date +%Y%m%d).sql

# 如果是裸机部署
pg_dump -U pixel_user pixeldesk > pixeldesk_backup_$(date +%Y%m%d).sql
```

---

## 🚀 部署流程

### 1. 更新代码
同步最新的代码及地图资源。

```bash
git pull origin main
```

### 2. 更新地图 Stable ID (如有必要)
确保 `public/assets/officemap.json` 已经包含了最新的 `ws_id` (UUID)。

```bash
# 在宿主机运行（因为涉及文件同步到 git/容器卷）
npm run update-map-ids
```

### 3. 执行 Prisma 架构变更
由于修改了工位 ID 的类型（从 `Int` 到 `String`），需要从容器内向数据库同步 Schema。务必确保容器已启动并能连接到 DB。

```bash
# 使用 Docker Compose 在应用容器内执行
docker compose exec app npx prisma migrate deploy
```

### 4. 执行数据迁移脚本
这是针对您提到的“工位 ID 修改”后的关键步骤。同样建议在容器内执行，以确保环境一致性。

```bash
# 在应用容器内运行迁移脚本
docker compose exec app node scripts/[您的迁移脚本名称].js
```
> [!NOTE]
> 请确保脚本中的 `DATABASE_URL` 正确指向生产数据库。

---

## 🧹 方案二：全新开始 (Fresh Start - 推荐)

如果您目前还没有重要生产数据，或者想彻底解决权限和 ID 冲突问题，请按此顺序操作：

### 1. 彻底停止并清理
这会删除现有容器和数据库卷，解决权限报错。
```bash
docker compose down -v
```

### 2. 构建镜像 (带权限修复)
确保我已经修改了 `Dockerfile` 中的权限。
```bash
docker compose build --no-cache app
```

### 3. 初始化数据库结构
先启动 DB，然后推送最新的 Schema (String ID)。
```bash
docker compose up -d db redis
# 等待 5 秒让 DB 启动
docker compose exec app npx prisma db push
```

### 4. 启动应用
```bash
docker compose up -d app
```

---

## 🔍 部署后验证清单

1.  **工位绑定验证**：进入游戏，尝试绑定一个新工位，检查 `user_workstations` 表中的 `workstationId` 是否为 UUID 格式。
2.  **存量数据验证**：检查老用户是否依然能正确关联到自己的工位。
3.  **日志检查**：查看 API 日志是否有关于 `workstation` 的类型错误。
    ```bash
    tail -f logs/error.log  # 或使用 docker logs
    ```
4.  **地图加载验证**：打开浏览器开发者工具，检查 `officemap.json` 加载是否正常，对象属性中是否包含 `ws_id`。

---

## 🚨 常见问题汇总

*   **Q: 迁移脚本执行超时怎么办？**
    *   A: 对大批量数据使用 Prisma 事务时需注意超时设置，必要时分批次执行。
*   **Q: Prisma 报错 ID 类型不兼容？**
    *   A: 如果 `Int` 转 `String` 在数据库层面受阻，可能需要先通过 SQL 手动 `ALTER TABLE ... TYPE text`。
*   **Q: `migrate deploy` 提示 "No migration found"？**
    *   A: `migrate deploy` 仅应用 `prisma/migrations` 文件夹下的**迁移文件夹**。如果您在本地使用的是 `db push` 而没有生成迁移文件，或者没有将迁移文件夹上传到服务器，就会提示此信息。
    *   **解决方案 A (推荐)**：在本地运行 `npx prisma migrate dev --name change_workstation_id` 生成迁移，然后提交并推送代码。
    *   **解决方案 B (快速同步)**：在服务器运行 `docker compose exec app npx prisma db push`。注意：这会直接强制数据库匹配 Schema，请确保已备份。
*   **Q: Docker Build 报错 `permission denied` 访问 `data/postgres`？**
    *   A: 这是因为 Docker 尝试将数据库数据目录包含在构建上下文中。请确保根目录存在 `.dockerignore` 文件并包含 `data` 目录。我已经为您创建了该文件。
*   **Q: Prisma 报错 `EACCES: permission denied` 或 `unlink ... node_modules`？**
    *   A: 这是因为容器内 `node_modules` 的所有者为 root。我已经更新了 `Dockerfile`，请重新构建镜像：`docker compose up --build -d`。
*   **Q: Firebase/Google Analytics 4 (GA4) 没有收到数据？**
    *   A: 由于这些是前端变量 (`NEXT_PUBLIC_`)，它们必须在**构建阶段**注入。我已经修改了 `Dockerfile` 和 `docker-compose.yml`。请确保服务器上的 `.env` 文件包含最新的 Firebase 配置，并重新运行 `docker compose up --build -d`。
*   **Q: Docker 构建报错 `failed to prepare extraction snapshot ... parent snapshot ... does not exist`？**
    *   A: 这是 Docker BuildKit 缓存损坏的常见问题。请尝试清理构建缓存并强制无缓存构建：
        1. 清理缓存：`docker builder prune -f`
        2. 强制构建：`docker compose build --no-cache app`
        3. 重新启动：`docker compose up -d`

---

> [!WARNING]
> **重要发现**：目前的 `prisma/schema.prisma` 中 `workstations.id` 仍为 `Int` 类型，而 `user_workstations.workstationId` 为 `String`。如果您在此前的脚本迁移中已经将工位 ID 改为了 UUID (String)，请务必确认 `schema.prisma` 是否已同步修改为 `id String @id`。

---

**维护人员**：Antigravity Assistant
**日期**：2026-01-19

---

## 🚀 迁移至对象存储 (OSS/CDN)

如果您希望将图片等静态资源托管到独立的 OSS（如阿里云 OSS、腾讯云 COS）或 CDN，请遵循以下步骤：

### 1. 准备工作
- 将服务器上 `public/uploads` 目录下的所有文件上传到您的 OSS Bucket 根目录。
- 确保 OSS 允许跨域访问（CORS），以便前端加载图片。

### 2. 配置环境变量
修改 `.env` 文件，设置 `NEXT_PUBLIC_ASSET_PREFIX`：
```bash
# 例如使用阿里云 OSS
NEXT_PUBLIC_ASSET_PREFIX=https://your-bucket-name.oss-cn-hangzhou.aliyuncs.com
```

### 3. 重建应用
由于这是一个 `NEXT_PUBLIC_` 变量，它在**构建时**被嵌入到客户端代码中。您需要重新构建镜像：
```bash
docker compose up --build -d
```

### 4. 验证
- 检查网页上的图片地址，它们现在应该以您的 OSS 域名开头。
- 如果某些图片无法加载，请检查 OSS 权限设置。

---

## 🛠️ 图片显示问题排查 (Troubleshooting Images)

如果您发现上传的图片显示为 404 或 400 (Bad Request)，请按以下步骤检查：

### 1. 检查 Nginx 路径配置
确保 `nginx.conf` 中的 `alias` 路径与服务器上的实际路径完全一致。
```nginx
location /uploads/ {
    alias /绝对路径/到/您的项目/uploads/; 
    # ...
}
```
**注意**：`alias` 路径必须以 `/` 结尾。

### 2. 检查目录权限
创建 `uploads` 目录并确保 Nginx 和 Docker 都有权限读写：
```bash
# 进入项目根目录
mkdir -p uploads/assets/blog
chmod -R 777 uploads
```

### 3. 重启服务
修改 `nginx.conf` 后需要重新加载或重启：
```bash
sudo nginx -t && sudo nginx -s reload
```
如果修改了代码（如 `PostDetailClient.tsx`），需要重新构建 Docker 镜像：
```bash
docker compose up --build -d app
```

### 4. 验证直接访问
尝试在浏览器直接访问不带 `/_next/image` 前缀的图片 URL，例如：
`https://yourdomain.com/uploads/assets/blog/xxx.png`
如果直接访问正常但 `next/image` 访问报错，说明 Nginx 配置已生效，代码中的 `unoptimized` 属性将解决此问题。

---

## 🏗️ 初始化数据 (Data Initialization)

如果您在服务器上需要快速初始化等级配置，可以使用我为您准备的脚本：

### 1. 导入等级配置
在项目根目录下运行：
```bash
docker compose exec app node scripts/seed-levels.js
```
该脚本会自动创建从 0 到 60 级的默认等级定义。

### 2. 初始化积分配置 (修复工位扣费为 0 的问题)
如果您发现签约工位没有扣除象素币，通常是因为数据库中缺少积分配置。请运行：
```bash
docker compose exec app node scripts/seed-points.js
```
该脚本会初始化工位绑定、传送、发帖奖励等积分规则。您可以多次运行它以重置或更新配置。

### 3. 初始化武侠 NPC
如果您想为办公室增加一些武侠风格的新角色，请运行：
```bash
docker compose exec app node scripts/seed-wuxia-npcs.js
```
该脚本会添加剑无痕、上官婉儿等具有武侠特色性格的 AI NPC。
