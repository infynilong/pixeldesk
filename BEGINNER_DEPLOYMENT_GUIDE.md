# PixelDesk Ubuntu 部署全流程指南 (新手版)

本指南专为没有部署经验的开发者设计，带你从零开始在 Ubuntu 服务器上运行 PixelDesk。

## 🛠️ 第一阶段：准备工作

### 1. 登录服务器
使用本地终端（Mac 的 Terminal 或 Windows 的 PowerShell）通过 SSH 登录服务器：
```bash
ssh root@你的服务器IP
```

### 2. 更新系统系统
登录后，先更新软件包列表：
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📦 第二阶段：安装 Docker (核心环境)

复制并运行以下命令，这会自动安装 Docker 及其所有依赖：

```bash
# 1. 下载并运行安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. 验证安装是否成功 (应显示版本号)
docker --version
docker compose version
```

---

## 🚀 第三阶段：拉取代码与配置

### 1. 克隆 GitHub 仓库
```bash
cd ~
git clone https://github.com/你的用户名/PixelDesk.git
cd PixelDesk
```

### 2. 创建环境变量文件
参考 `.env.example` 创建一个 `.env` 文件：

```bash
cp .env.example .env
nano .env  # 或者使用您喜欢的编辑器修改
```

请确保填写了以下关键变量：
- `DATABASE_URL`: 数据库连接串 (例如 `postgresql://pixel_user:password@db:5432/pixeldesk`)
- `REDIS_URL`: Redis 连接串 (例如 `redis://:password@redis:6379`)
- `JWT_SECRET` & `NEXTAUTH_SECRET`: 使用强随机字符串
- `NEXTAUTH_URL`: 设为 `https://yourdomain.com`
- `PG_PASSWORD` & `REDIS_PASSWORD`: 数据库和 Redis 的密码

> [!IMPORTANT]
> **默认文件名**: Docker Compose 默认会自动加载根目录下名为 `.env` 的文件。

---

## 🏗️ 第四阶段：反向代理与 SSL (已有 Nginx 方案)

由于您服务器的 80/443 端口通常已被占用，我们采用 **“宿主机 Nginx 转发到 Docker”** 的方案。

### 1. 获取免费 SSL 证书 (Certbot)
针对你的域名，运行以下命令：
```bash
# 1. 安装 certbot
sudo apt install certbot -y

# 2. 获取证书
sudo certbot certonly --standalone -d yourdomain.com
```

### 2. 配置宿主机 Nginx
在您的宿主机 Nginx 配置文件中，添加此域名的 `server` 块：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # 推荐安全协议
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3010; # 对应 docker-compose 中暴露的端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🏁 第五阶段：启动与初始化

### 1. 启动应用
```bash
docker compose up -d --build
```

### 2. 初始化数据库
程序启动后，同步数据库表结构：
```bash
docker compose exec app npx prisma db push
```

### 3. 初始化管理员账户 (必要)
由于首次部署数据库为空，我们需要运行种子脚本来创建默认管理员账户和基础配置：
```bash
# 此命令会创建默认管理员账户 (admin/pixel-dashboard123) 或根据 .env 配置创建
docker compose exec app npm run prisma db seed
docker compose exec app npx tsx prisma/seed-admin.ts

```
> **安全警告**: 请务必在 `.env` 中配置 `ADMIN_PASSWORD` 以确保账户安全。如果未配置，将使用默认的不安全密码。

---

## 🛡️ 第六阶段：数据持久化与安全建议

1. **数据存储**
   项目根目录下的 `data` 文件夹包含数据库和 Redis 的所有持久化数据。

2. **如何更新代码**
   ```bash
   git pull
   docker compose up -d --build
   ```

---

## 💡 常见问题排查 (FAQ)

> [!TIP]
> **遇到 "Not Secure" 或登录重定向问题？**
> 1. 确保宿主机 Nginx 转发时包含了 `proxy_set_header X-Forwarded-Proto $scheme;`。
> 2. 在 `.env` 中确保 `NEXTAUTH_URL` 是以 `https://` 开头。
> 3. 确保 Nginx 禁用了受损的 TLS 版本 (v1.0/v1.1)。

### 1. 移动端 TabBar 消失？
确保应用已更新到最新版本，并在 `globals.css` 中使用了 `h-full-dvh` 修复。

### 2. 数据库连接失败？
检查 `.env` 中的 `DATABASE_URL` 里的密码是否正确，且是否与 `PG_PASSWORD` 一致。
