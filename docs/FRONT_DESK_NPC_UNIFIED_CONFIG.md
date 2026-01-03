# 前台客服与NPC大模型配置统一说明

## 📋 现状分析

### ✅ 已实现的功能

1. **ESC键支持**
   - ✅ FrontDeskChatModal 已支持ESC键关闭
   - ✅ 使用 `window.addEventListener('keydown', handleEsc)` 监听全局ESC事件

2. **大模型集成**
   - ✅ 使用统一的 `callAiProvider` 适配器
   - ✅ 支持多种AI提供商（DeepSeek、SiliconFlow、Gemini）
   - ✅ 已添加 `modelId` 字段支持个性化配置

3. **角色定义**
   - ✅ 数据库表结构清晰：`front_desk` 表定义前台服务人员
   - ✅ `ai_npcs` 表定义游戏NPC角色
   - ✅ 两者都支持 `systemPrompt` 和 `modelId` 配置

4. **后台配置系统**
   - ✅ [prisma/schema.prisma:86-101]() `front_desk` 表已完善
   - ✅ [prisma/schema.prisma:124-135]() `ai_npcs` 表结构统一
   - ✅ 使用相同的 `/api/ai/npcs` 管理接口

## 🔄 统一改进方案

### 1. 数据库表结构统一

```prisma
// 前台客服表
model front_desk {
  id            String   @id
  name          String
  sprite        String
  x             Int
  y             Int
  serviceScope  String   // 服务范围
  workingHours  String?  // 工作时间
  greeting      String   // 问候语
  systemPrompt  String   @db.Text
  modelId       String?  // ← 新增：AI模型ID
  isActive      Boolean  @default(true)
  isFixed       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime
}

// NPC表（已统一）
model ai_npcs {
  id          String   @id
  name        String
  sprite      String
  x           Int
  y           Int
  personality String
  greeting    String?
  isActive    Boolean  @default(true)
  knowledge   String?
  role        String?
  isFixed     Boolean  @default(false)
}
```

### 2. API接口统一

```typescript
// 统一的AI调用接口
POST /api/ai/chat
{
  npcId: string,      // NPC或前台ID
  message: string,    // 用户消息
  npcType: string     // "npc" 或 "front_desk"
}

// 创建/更新配置
POST /api/ai/npcs
{
  name: string,
  sprite: string,
  x: number,
  y: number,
  systemPrompt?: string,
  modelId?: string,      // 可选：使用特定模型
  personality?: string,
  greeting?: string
}
```

### 3. 配置方式统一

**前端配置方式（两者相同）：**

```typescript
// NPC配置
{
  id: 'npc_tech_support',
  name: '技术支持工程师',
  systemPrompt: '你是专业的技术支持工程师...',
  modelId: 'gemini-1.5-flash', // 可选
  greeting: '你好！我是技术支持工程师，请问有什么可以帮助您的？',
  ...
}

// 前台配置
{
  id: 'front_desk_account',
  name: '账户服务客服',
  systemPrompt: '你是专业的客服代表，专注于账户服务...',
  modelId: 'deepseek-chat', // 可选
  greeting: '欢迎！我是账户服务客服，很高兴为您服务！',
  serviceScope: '账户服务',
  ...
}
```

### 4. 大模型调用逻辑统一

```typescript
// app/api/front-desk/chat/route.ts
const aiResponse = await callAiProvider(
    messagesToSend,
    {
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        modelName: desk.modelId || finalModelName, // 优先使用配置的modelId
        temperature: 0.7,
        baseUrl: aiConfig.baseUrl || undefined
    }
)
```

## 🎯 配置管理界面

### 后台管理路径

```
/admin/ai/npcs         - NPC管理界面
/admin/front-desk      - 前台管理界面（建议使用相同UI组件）
```

### 配置字段说明

| 字段 | 说明 | NPC | 前台 |
|------|------|-----|------|
| `name` | 显示名称 | ✅ | ✅ |
| `sprite` | 精灵图路径 | ✅ | ✅ |
| `x`, `y` | 地图坐标 | ✅ | ✅ |
| `systemPrompt` | AI系统提示词 | ✅ | ✅ |
| `modelId` | AI模型ID（可选） | ✅ | ✅ |
| `greeting` | 问候语 | ✅ | ✅ |
| `personality` | 性格描述 | ✅ | ❌ |
| `serviceScope` | 服务范围 | ❌ | ✅ |
| `workingHours` | 工作时间 | ❌ | ✅ |

## 🔧 实施步骤

### 已完成的步骤

✅ 1. 数据库添加 `modelId` 字段
   ```bash
   npx prisma db push
   ```

✅ 2. FrontDeskChatModal 添加 ESC键支持
   - 全局监听 `keydown` 事件
   - ESC键触发 `onClose()`

✅ 3. API接口支持 `modelId` 参数
   - `/api/front-desk/chat` 优先使用 `desk.modelId`

### 待优化的建议

1. **统一管理界面**
   - 使用相同的表单组件
   - 合并相关路由

2. **角色定义文档**
   - 创建角色配置文件
   - 添加详细的使用说明

3. **监控和日志**
   - 统一日志格式
   - 添加使用统计

## 📊 使用统计

两种角色的使用情况统一记录在 `ai_usage` 表：

```sql
SELECT
    date,
    COUNT(*) as total_calls,
    SUM(promptTokens) as total_prompt_tokens,
    SUM(completionTokens) as total_completion_tokens
FROM ai_usage
GROUP BY date;
```

## 📝 配置文件示例

### NPC配置示例

```json
{
  "id": "tech_expert_001",
  "name": "技术专家小李",
  "sprite": "tech_expert.png",
  "x": 500,
  "y": 300,
  "systemPrompt": "你是游戏世界的技术专家，精通各种技术问题...",
  "modelId": "deepseek-ai/DeepSeek-V3",
  "personality": "专业、耐心、技术导向",
  "greeting": "你好！有什么技术问题需要我帮忙解决吗？"
}
```

### 前台客服配置示例

```json
{
  "id": "account_service_001",
  "name": "账户服务专员",
  "sprite": "customer_service.png",
  "x": 200,
  "y": 150,
  "serviceScope": "账户管理服务",
  "workingHours": "9:00-18:00",
  "systemPrompt": "你是专业的账户服务客服，专注于解决用户的账户相关问题...",
  "modelId": "gemini-1.5-flash",
  "greeting": "您好！欢迎使用PixelDesk账户服务，有什么可以帮助您的吗？"
}
```

## ✅ 测试清单

- [ ] 前台弹窗支持ESC键关闭
- [ ] 前台客服调用大模型成功
- [ ] 使用配置的 `modelId` 优先级正确
- [ ] AI对话历史正确记录
- [ ] 使用统计正确更新
- [ ] 配置文件可灵活调整
