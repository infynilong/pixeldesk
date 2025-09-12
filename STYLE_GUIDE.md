# PixelDesk 样式指南

## 色彩系统

### 复古像素风格色彩变量
项目使用统一的复古像素风格色彩系统，所有组件都应使用这些颜色变量：

```css
:root {
  --retro-bg-dark: #1a1b26;
  --retro-bg-darker: #16161e;
  --retro-text: #c0caf5;
  --retro-text-muted: #565f89;
  --retro-border: #414868;
  
  /* 复古游戏机色彩 */
  --retro-red: #ff5c57;
  --retro-orange: #ff9e3b;
  --retro-yellow: #f9f871;
  --retro-green: #5af78e;
  --retro-blue: #57c7ff;
  --retro-purple: #c74ded;
  --retro-pink: #ff6ac1;
  --retro-cyan: #9aedfe;
}
```

### Tailwind 颜色类名对应关系
- `bg-retro-bg-dark` - 主要背景色
- `bg-retro-bg-darker` - 深色背景
- `text-retro-text` - 主要文字颜色
- `text-retro-textMuted` - 次要文字颜色
- `border-retro-border` - 边框颜色
- 状态颜色：`retro-red`, `retro-orange`, `retro-green`, `retro-blue`, `retro-purple`, `retro-pink`

## 渐变样式

### 主要渐变
- 紫色到粉色渐变：`bg-gradient-to-r from-retro-purple to-retro-pink`
- 蓝色到青色渐变：`bg-gradient-to-r from-retro-blue to-retro-cyan`
- 透明渐变：`from-retro-purple/10 to-retro-pink/10` (用于背景)

### 按钮渐变
```jsx
// 主要按钮
className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-blue hover:to-retro-cyan"

// 次要按钮  
className="bg-retro-border/30 hover:bg-retro-border/50 border border-retro-border/50"
```

## 组件样式规范

### 消息气泡 (MessageBubble)
- 自己发送的消息：紫色到粉色渐变
- 接收的消息：灰色背景带边框
- 系统消息：居中灰色背景

### 通知徽章 (NotificationBadge)
- 使用紫色到粉色渐变
- 支持脉冲和发光效果

### 错误显示 (ErrorDisplay)
- 错误：红色系 (`retro-red`)
- 警告：橙色系 (`retro-orange`)  
- 信息：蓝色系 (`retro-blue`)

### 窗口样式
- 背景：`bg-retro-bg-darker`
- 边框：`border border-retro-border`
- 圆角：`rounded-lg`
- 阴影：`shadow-2xl` 和 `shadow-retro-purple/20`

## 响应式设计

### 断点
- 移动端: `max-width: 640px`
- 平板: `641px - 1024px`  
- 桌面: `min-width: 1025px`

### 移动端优化
- 简化界面元素
- 增大点击区域
- 优化触摸交互

## 动画效果

### 加载动画
使用复古像素风格的加载动画：
```jsx
<div className="flex items-center space-x-2 mb-3">
  <div className="w-2 h-2 bg-retro-purple rounded-full animate-bounce"></div>
  <div className="w-2 h-2 bg-retro-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
  <div className="w-2 h-2 bg-retro-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
</div>
```

### 悬停效果
- 缩放: `hover:scale-105`
- 阴影增强: `hover:shadow-xl`
- 颜色变化: 使用渐变变化

## 字体

### 主要字体
- `font-pixel`: "Press Start 2P", monospace (像素字体)
- `font-retro`: "VT323", monospace (复古终端字体)

### 使用规范
- 标题: `font-pixel` 
- 正文: `font-retro`
- 按钮: 根据风格选择字体

## 最佳实践

1. **一致性**: 所有组件使用相同的颜色变量
2. **渐进增强**: 支持优雅降级
3. **性能**: 使用CSS变量和Tailwind优化
4. **可访问性**: 确保足够的对比度
5. **响应式**: 适配所有设备尺寸

## 示例代码

### 标准按钮
```jsx
<button className="bg-gradient-to-r from-retro-purple to-retro-pink hover:from-retro-blue hover:to-retro-cyan text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95">
  点击我
</button>
```

### 卡片组件
```jsx
<div className="bg-retro-bg-darker border border-retro-border rounded-lg shadow-2xl p-4">
  <h3 className="text-white font-pixel">标题</h3>
  <p className="text-retro-textMuted font-retro">内容描述</p>
</div>
```