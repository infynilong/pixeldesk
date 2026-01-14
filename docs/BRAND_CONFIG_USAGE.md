# 品牌配置系统使用指南

## 概述

品牌配置系统允许你在后台统一管理应用的品牌信息（名称、标语、Logo等），并支持多语言配置。这样可以避免在代码中硬编码品牌信息，方便后续修改和国际化。

## 功能特性

- ✅ 统一管理品牌名称、标语、Logo、描述
- ✅ 支持多语言配置（中文、英文、日文等）
- ✅ 后台可视化管理界面
- ✅ 前端自动缓存（5分钟）
- ✅ 提供统一的React Hook和组件

## 快速开始

### 1. 数据库迁移

首先需要运行数据库迁移创建配置表：

```bash
# 生成 Prisma Client
npx prisma generate

# 运行迁移SQL
psql -d your_database -f prisma/migrations/add_brand_config.sql

# 或者使用 Prisma Migrate
npx prisma migrate dev --name add_brand_config
```

### 2. 在组件中使用

#### 方法一：使用 `useBrandConfig` Hook

```tsx
import { useBrandConfig } from '@/lib/hooks/useBrandConfig'

export default function MyComponent() {
  const { config, isLoading } = useBrandConfig('zh-CN')

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{config.app_name}</h1>
      <p>{config.app_slogan}</p>
      <img src={config.app_logo} alt={config.app_name} />
      <p>{config.app_description}</p>
    </div>
  )
}
```

#### 方法二：使用 `BrandHeader` 组件（推荐）

```tsx
import BrandHeader, { BrandName, BrandLogo } from '@/components/BrandHeader'

// 完整的品牌头部（包含Logo、名称、标语）
<BrandHeader showLogo showSlogan size="md" />

// 仅显示品牌名称
<BrandName className="font-bold text-xl" />

// 仅显示Logo
<BrandLogo size="lg" />
```

### 3. 替换现有代码

#### 替换前（硬编码）：

```tsx
// ❌ 不推荐 - 硬编码
<div className="flex items-center gap-2">
  <img src="/assets/icon.png" alt="象素工坊" className="w-8 h-8" />
  <div>
    <h1 className="text-xl font-bold text-white">象素工坊</h1>
    <p className="text-xs text-gray-400">社交办公游戏</p>
  </div>
</div>
```

#### 替换后（使用配置）：

```tsx
// ✅ 推荐 - 使用统一配置
import BrandHeader from '@/components/BrandHeader'

<BrandHeader showLogo showSlogan size="md" />
```

## 后台管理

访问 `/admin/settings/brand` 进行品牌配置管理。

### 管理界面功能

1. **选择语言**：切换不同语言的配置
2. **编辑配置**：修改品牌名称、标语、Logo路径、描述
3. **保存更改**：批量保存当前语言的所有配置
4. **实时预览**：Logo配置支持实时预览

### 配置项说明

| 配置Key | 说明 | 类型 | 示例 |
|---------|------|------|------|
| `app_name` | 应用名称 | text | 象素工坊 |
| `app_slogan` | 应用标语/副标题 | text | 社交办公游戏 |
| `app_logo` | Logo图片路径 | image | /assets/icon.png |
| `app_description` | 应用描述 | text | 一个有趣的社交办公游戏平台 |

## API 接口

### GET `/api/brand-config`

获取品牌配置

**参数：**
- `locale` (optional): 语言代码，默认 `zh-CN`
- `key` (optional): 获取单个配置项

**示例：**

```bash
# 获取所有配置
GET /api/brand-config?locale=zh-CN

# 获取单个配置
GET /api/brand-config?locale=zh-CN&key=app_name
```

**响应：**

```json
{
  "success": true,
  "data": {
    "app_name": { "value": "象素工坊", "type": "text" },
    "app_slogan": { "value": "社交办公游戏", "type": "text" },
    "app_logo": { "value": "/assets/icon.png", "type": "image" },
    "app_description": { "value": "一个有趣的社交办公游戏平台", "type": "text" }
  }
}
```

### POST `/api/brand-config`

创建或更新单个配置项（需要管理员权限）

**请求体：**

```json
{
  "key": "app_name",
  "locale": "zh-CN",
  "value": "新的应用名称",
  "type": "text"
}
```

### PUT `/api/brand-config`

批量更新配置（需要管理员权限）

**请求体：**

```json
{
  "locale": "zh-CN",
  "configs": [
    { "key": "app_name", "value": "象素工坊", "type": "text" },
    { "key": "app_slogan", "value": "社交办公游戏", "type": "text" }
  ]
}
```

## 高级用法

### 预加载配置

在应用启动时预加载配置以提升性能：

```tsx
// app/layout.tsx
import { preloadBrandConfig } from '@/lib/hooks/useBrandConfig'

export default async function RootLayout({ children }) {
  // 预加载配置
  await preloadBrandConfig('zh-CN')

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### 清除缓存

配置更新后清除前端缓存：

```tsx
import { clearBrandConfigCache } from '@/lib/hooks/useBrandConfig'

// 在保存配置后调用
await saveConfig()
clearBrandConfigCache()
```

### 服务端获取配置

在服务端组件中同步获取配置（使用缓存）：

```tsx
import { getBrandConfig } from '@/lib/hooks/useBrandConfig'

export default function ServerComponent() {
  const config = getBrandConfig()

  return <h1>{config.app_name}</h1>
}
```

## 迁移现有代码

需要替换的常见模式：

### 1. 直接使用 "PixelDesk" 或 "象素工坊"

```tsx
// ❌ 替换前
<h1>象素工坊</h1>

// ✅ 替换后
import { BrandName } from '@/components/BrandHeader'
<BrandName className="text-xl font-bold" />
```

### 2. 直接使用 Logo 路径

```tsx
// ❌ 替换前
<img src="/assets/icon.png" alt="Logo" className="w-8 h-8" />

// ✅ 替换后
import { BrandLogo } from '@/components/BrandHeader'
<BrandLogo size="md" />
```

### 3. 头部导航栏

```tsx
// ❌ 替换前
<div className="flex items-center gap-2">
  <img src="/assets/icon.png" className="w-8 h-8" />
  <div>
    <h1 className="text-xl">象素工坊</h1>
    <p className="text-xs">社交办公游戏</p>
  </div>
</div>

// ✅ 替换后
import BrandHeader from '@/components/BrandHeader'
<BrandHeader showLogo showSlogan size="md" />
```

## 注意事项

1. **缓存时间**：前端配置缓存5分钟，如需立即生效可刷新页面
2. **语言回退**：如果找不到指定语言的配置，会自动回退到第一个可用语言
3. **图片路径**：Logo路径建议使用相对路径（如 `/assets/icon.png`）
4. **权限控制**：配置更新API需要添加管理员权限验证（TODO）

## 支持的语言

- `zh-CN`: 简体中文
- `en-US`: English
- `zh-TW`: 繁體中文
- `ja-JP`: 日本語

可在后台管理界面添加更多语言支持。

## 常见问题

### Q: 如何添加新的配置项？

A: 在 `DEFAULT_CONFIGS` 和 `CONFIG_LABELS` 中添加新配置，然后在 `BrandConfig` 类型中添加对应字段。

### Q: 配置更新后前端没有立即生效？

A: 前端有5分钟缓存，可以刷新页面或调用 `clearBrandConfigCache()` 清除缓存。

### Q: 如何自定义配置项的显示样式？

A: 可以直接使用 `useBrandConfig` Hook 获取配置数据，然后自定义渲染逻辑。

## 相关文件

- API路由: `/app/api/brand-config/route.ts`
- React Hook: `/lib/hooks/useBrandConfig.ts`
- 组件: `/components/BrandHeader.tsx`
- 后台管理: `/app/admin/settings/brand/page.tsx`
- 数据库模型: `/prisma/schema.prisma` (brand_config表)
- 迁移脚本: `/prisma/migrations/add_brand_config.sql`
