# PixelDesk - 社交办公游戏平台

一个基于 Next.js 和 Phaser 的社交办公游戏平台，将传统的办公环境与游戏化社交体验相结合。

## 功能特性

### 🎮 游戏功能
- 基于 Phaser 3 的 2D 像素风格游戏
- 可自定义的角色和办公室环境
- 工位绑定系统
- 洗手间等办公设施

### 🤝 社交功能
- **实时状态更新**: 发布你的工作状态（工作、休息、阅读、会议等）
- **玩家互动**: 靠近其他玩家查看他们的动态信息
- **留言系统**: 对其他玩家的动态进行评论和互动
- **状态同步**: 游戏内状态与网页界面实时同步

### 📱 响应式设计
- **桌面端**: 左右分栏布局，左侧是社交面板，右侧是游戏区域
- **移动端**: 上下布局，上方是游戏，下方是社交信息

## 技术栈

- **前端框架**: Next.js 14 + React 18
- **游戏引擎**: Phaser 3
- **样式**: Tailwind CSS
- **语言**: TypeScript

## 项目结构

```
PixelDesk/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 主页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── PhaserGame.tsx     # Phaser 游戏组件
│   ├── SocialFeed.tsx     # 社交动态组件
│   └── PostStatus.tsx     # 状态发布组件
├── lib/                   # 工具函数
│   └── social.ts          # 社交功能工具
├── PixelDesk/             # 原始 Phaser 项目
│   ├── src/               # Phaser 源码
│   │   ├── entities/      # 游戏实体
│   │   ├── scenes/        # 游戏场景
│   │   ├── logic/         # 游戏逻辑
│   │   └── components/    # UI 组件
│   └── assets/            # 游戏资源
└── package.json           # 依赖配置
```

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 构建生产版本
```bash
npm run build
npm start
```

## 游戏玩法

1. **角色控制**: 使用方向键或 WASD 键移动角色
2. **工位绑定**: 靠近工位进行绑定，建立你的办公位置
3. **状态更新**: 在左侧面板更新你的工作状态
4. **社交互动**: 靠近其他玩家查看他们的动态信息并进行留言
5. **相机控制**: 使用鼠标滚轮（配合 Ctrl 键）缩放视角

## 社交功能

### 状态类型
- 💼 工作中
- ☕ 休息中
- 📚 阅读中
- 🚻 洗手间
- 👥 会议中
- 🍽️ 午餐时间

### 互动方式
1. **状态发布**: 在左侧面板选择状态并添加自定义消息
2. **查看动态**: 靠近其他玩家自动显示他们的动态信息
3. **留言评论**: 对其他玩家的动态进行实时评论
4. **状态同步**: 游戏内状态标签与网页界面实时同步

## 数据通信

### Next.js → Phaser
- 通过 `window.updateMyStatus()` 全局函数传递状态更新
- 使用 React 的 `useEffect` 和自定义事件处理

### Phaser → Next.js
- 通过 `window.onPlayerCollision()` 全局函数传递碰撞事件
- 使用 Phaser 的 `overlap` 碰撞检测机制

## 开发说明

### 添加新状态
1. 在 `lib/social.ts` 中添加新的状态选项
2. 在 `components/PostStatus.tsx` 中更新 UI
3. 在 Phaser 场景中处理相应的逻辑

### 自定义角色
1. 在 `PixelDesk/assets/characters/` 中添加新的角色素材
2. 在 `Start.js` 中加载新的角色资源
3. 更新角色选择和创建逻辑

### 扩展社交功能
1. 添加新的社交组件到 `components/` 目录
2. 在主页面中集成新组件
3. 实现与 Phaser 的数据通信

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！