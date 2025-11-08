# 角色Key架构重构分析报告

## 📋 当前架构问题

### 问题描述
目前系统中存在两种角色标识方式混用的问题：
1. **User表**：使用 `avatar` 字段存储图片URL（如头像）
2. **Player表**：使用 `characterSprite` 字段存储角色名称key
3. **Character表**：使用 `imageUrl` 字段存储图片完整路径

这导致数据不一致、维护困难，且违反了"单一数据源"原则。

### 目标架构
统一使用**角色key**作为唯一标识：
- 数据库只存储角色key（如 `hangli`, `Premade_Character_48x48_01`）
- API层负责将key转换为完整的图片URL
- 前端接收处理好的URL进行展示

---

## 🔍 需要改动的文件清单

### 1️⃣ 数据库层 (Prisma Schema)

#### 文件：`prisma/schema.prisma`

**当前状态：**
```prisma
model User {
  avatar String?  // 当前存储URL
}

model Player {
  characterSprite String  // 已经是key，正确的
}
```

**需要修改：**
```prisma
model User {
  avatar String?  // 改名为 characterKey，只存key
  // 或者直接复用Player的characterSprite，统一命名
}
```

**改动点：**
- [ ] User.avatar → User.characterKey（或保持avatar但改为存key）
- [ ] 添加数据库迁移脚本
- [ ] 更新种子数据（seed）

---

### 2️⃣ API层 - 需要添加key到URL的转换逻辑

#### 核心转换函数
**新建文件：** `lib/characterUtils.ts`

```typescript
/**
 * 将角色key转换为完整URL
 */
export function getCharacterImageUrl(characterKey: string): string {
  // 基础路径
  const basePath = '/assets/characters'

  // 根据key获取文件扩展名（需要查Character表）
  // 或使用默认扩展名
  return `${basePath}/${characterKey}.png`
}

/**
 * 从Character表获取角色信息并转换
 */
export async function getCharacterWithUrl(characterKey: string) {
  const character = await prisma.character.findUnique({
    where: { name: characterKey }
  })

  if (!character) return null

  return {
    ...character,
    imageUrl: character.imageUrl  // Character表已存完整URL
  }
}
```

#### 需要修改的API端点

##### A. `/api/auth/me/route.ts`
**改动：** 返回user时转换avatar
```typescript
// 当前
return { user: { avatar: user.avatar } }

// 修改后
return {
  user: {
    avatar: user.avatar ? getCharacterImageUrl(user.avatar) : null
  }
}
```

##### B. `/api/player/route.ts`
**改动：**
- GET时返回characterSprite的URL版本
- POST/PUT时只存储key

```typescript
// GET响应
return {
  player: {
    characterSprite: player.characterSprite,  // key
    characterImageUrl: getCharacterImageUrl(player.characterSprite)  // 新增URL字段
  }
}
```

##### C. `/api/users/route.ts` 和 `/api/users-simple/route.ts`
**改动：** 批量查询用户时转换avatar

##### D. `/api/profile/[userId]/route.ts`
**改动：** 用户资料页面的avatar转换

##### E. `/api/posts/*` 相关端点
**改动：** 帖子作者的avatar转换

##### F. `/api/workstations/visible-bindings/route.ts` 和 `/api/workstations/all-bindings/route.ts`
**用户在工位上看到的第975行问题：**
```javascript
// 当前代码 (WorkstationManager.js:975)
characterKey: 'Premade_Character_48x48_01'
```
这里返回给前端的应该是key，前端再决定如何使用。

---

### 3️⃣ 前端组件层

#### A. `/components/CharacterCreationModal.tsx`
**改动：**
```typescript
// 当前：选择character后使用character.imageUrl
onComplete({
  characterSprite: character.name,  // 存key到数据库
  characterImageUrl: character.imageUrl  // 仅用于前端展示
})
```

#### B. `/contexts/UserContext.tsx`
**改动：**
```typescript
// user.avatar 现在是key，需要转换为URL展示
const avatarUrl = user.avatar ? getCharacterImageUrl(user.avatar) : null
```

#### C. `/components/AuthenticationHeader.tsx`
**改动：** 显示用户头像时使用转换后的URL

#### D. `/components/CharacterDisplayModal.tsx`
**改动：** 显示角色图片时的URL处理

#### E. `/components/tabs/PlayerProfileTab.tsx`
**改动：** 玩家资料卡的头像显示

#### F. `/components/PostCard.tsx` 和其他展示用户头像的组件
**改动：** 所有显示avatar的地方

#### G. `/app/page.tsx`
**改动：** 主游戏页面的角色数据处理
```typescript
// 当前混用avatar和character
setCurrentUser({
  avatar: user.avatar,  // 可能是URL
  character: gameUser.character  // 是key
})

// 统一为key
setCurrentUser({
  characterKey: user.characterKey || gameUser.character,
  characterImageUrl: getCharacterImageUrl(...)  // 前端需要URL时转换
})
```

---

### 4️⃣ 游戏层 (Phaser)

#### A. `/PixelDesk/src/scenes/Start.js`
**改动：**
```javascript
// 当前：characterConfigs存储角色配置
this.characterConfigs.set(character.name, {
  isCompactFormat: character.isCompactFormat,
  totalFrames: character.totalFrames,
  frameWidth: character.frameWidth,
  frameHeight: character.frameHeight,
  imageUrl: character.imageUrl  // 已经是完整URL，保持不变
})
```

#### B. `/PixelDesk/src/logic/WorkstationManager.js` (第975行)
**当前问题：**
```javascript
// 返回给前端的数据
{
  characterKey: 'Premade_Character_48x48_01'  // 这是key
}
```
**不需要修改**，继续返回key即可，前端负责转换。

#### C. `/PixelDesk/src/entities/Player.js`
**当前：** 接收spriteKey（已经是key）
**不需要修改**，游戏层继续使用key加载资源。

---

### 5️⃣ 工具函数和类型定义

#### A. `/lib/playerSync.ts`
**改动：**
```typescript
// 当前
character: data.data.player.characterSprite  // key

// 可能需要添加
characterImageUrl: getCharacterImageUrl(data.data.player.characterSprite)
```

#### B. `/lib/tempPlayerManager.ts`
**改动：** 临时玩家存储characterKey

#### C. `/types/social.ts` 等类型文件
**改动：** 更新接口定义
```typescript
interface User {
  avatar?: string  // 现在是key而非URL
  characterKey?: string  // 明确的key字段
}
```

---

## 📦 完整改动方案

### 阶段1：数据库架构调整
1. **创建迁移脚本** 将User.avatar从URL转为key
2. **数据迁移**
   - 提取现有avatar URL中的角色名
   - 或者将avatar设为null，让用户重新选择
3. **更新seed数据**

### 阶段2：创建转换工具函数
```typescript
// lib/characterUtils.ts
export function getCharacterImageUrl(key: string): string
export async function getCharacterInfo(key: string)
export function isValidCharacterKey(key: string): boolean
```

### 阶段3：API层改造
1. 所有返回user的端点添加avatar转换
2. 所有返回player的端点添加characterSprite转换
3. 所有接收avatar/characterSprite的端点验证key有效性

### 阶段4：前端组件改造
1. 创建 `useCharacterImage` hook处理key到URL转换
2. 更新所有显示头像/角色的组件
3. 更新UserContext的数据结构

### 阶段5：游戏层适配
1. 确认Phaser继续使用key加载资源
2. WorkstationManager返回key给前端
3. 前端接收key后调用hook转换为URL

---

## ⚠️ 潜在风险点

### 1. 数据一致性
- **风险：** 现有数据库中User.avatar可能存储了各种格式
- **方案：**
  - 写数据清理脚本
  - 验证所有avatar是否对应有效的Character记录

### 2. 历史数据兼容性
- **风险：** 旧的localStorage/session数据可能还是URL格式
- **方案：** 添加兼容层，自动检测和转换

### 3. 多处并发修改
- **风险：** 63个文件需要修改，容易遗漏
- **方案：**
  - 按阶段逐步推进
  - 充分的单元测试和集成测试
  - 使用TypeScript严格模式发现类型错误

### 4. Character表的imageUrl字段
- **问题：** Character表已经存储完整URL，是否也要改为相对路径？
- **建议：** Character表可以保留imageUrl，因为：
  - 它是角色素材的"主表"
  - 可能支持外部CDN URL
  - 内部引用时使用name(key)即可

---

## 🎯 推荐实施步骤

### Step 1: 准备工作
- [ ] 备份数据库
- [ ] 创建feature分支
- [ ] 编写数据迁移脚本

### Step 2: 核心工具函数
- [ ] 实现 `lib/characterUtils.ts`
- [ ] 添加单元测试

### Step 3: API层改造
- [ ] 修改所有API端点的输入验证
- [ ] 修改所有API端点的输出转换
- [ ] API集成测试

### Step 4: 前端改造
- [ ] 创建 `useCharacterImage` hook
- [ ] 逐个更新组件
- [ ] 前端E2E测试

### Step 5: 数据迁移
- [ ] 运行迁移脚本
- [ ] 验证数据完整性
- [ ] 全量测试

### Step 6: 清理
- [ ] 移除废弃代码
- [ ] 更新文档
- [ ] Code Review

---

## 📊 影响范围统计

| 层级 | 文件数量 | 改动复杂度 |
|------|---------|-----------|
| 数据库 | 1 | 🔴 高 |
| API层 | ~15 | 🟡 中 |
| 前端组件 | ~30 | 🟡 中 |
| 游戏层 | ~3 | 🟢 低 |
| 工具函数 | ~5 | 🟡 中 |
| **总计** | **~54** | **🔴 高** |

---

## 💡 优化建议

### 建议1：统一命名
建议在整个系统中使用统一的字段名：
- `characterKey` - 存储在数据库的key
- `characterImageUrl` - API返回给前端的URL
- `characterSprite` - Phaser游戏内部使用的key

### 建议2：缓存策略
```typescript
// 缓存角色信息，避免重复查询
const characterCache = new Map<string, Character>()

export async function getCharacterInfo(key: string) {
  if (characterCache.has(key)) {
    return characterCache.get(key)
  }
  // ... 查询数据库
}
```

### 建议3：前端统一处理
```typescript
// hooks/useCharacterImage.ts
export function useCharacterImage(characterKey: string | null) {
  return useMemo(() => {
    if (!characterKey) return null
    return `/assets/characters/${characterKey}.png`
  }, [characterKey])
}

// 使用
const avatarUrl = useCharacterImage(user.characterKey)
```

---

## 结论

这是一个**高优先级、中等复杂度**的重构任务。虽然涉及文件较多，但改动逻辑清晰：

**核心原则：**
- 📦 **数据库存key**
- 🔄 **API层转换**
- 🖼️ **前端使用URL**

建议**分5个阶段**逐步实施，每个阶段独立测试，确保系统稳定性。
