# PixelDesk 设计系统规范

> 本文档定义了 PixelDesk 项目的统一视觉风格和设计规范

## 🎨 配色方案

### 主色调：蓝绿色系

**用途**：按钮、链接、高亮、交互元素

```css
/* Cyan */
cyan-400: #22d3ee  /* 亮蓝 */
cyan-500: #06b6d4  /* 标准蓝 */
cyan-600: #0891b2  /* 深蓝 */

/* Teal */
teal-400: #2dd4bf  /* 亮青 */
teal-500: #14b8a6  /* 标准青 */
teal-600: #0d9488  /* 深青 */
```

**常用组合**：
- 主按钮：`bg-gradient-to-r from-cyan-600 to-teal-600`
- 悬停状态：`hover:from-cyan-500 hover:to-teal-500`
- Logo 背景：`bg-gradient-to-br from-cyan-500 to-teal-500`
- 博客标签：`bg-cyan-600/20 text-cyan-400 border border-cyan-500/30`

### 强调色：橙色 & 翠绿色

**用途**：特殊状态、数据展示、通知

```css
/* Orange */
orange-400: #fb923c
orange-500: #f97316
orange-600: #ea580c

/* Emerald */
emerald-400: #34d399
emerald-500: #10b981
emerald-600: #059669
```

**使用场景**：
- 获赞数：`bg-gradient-to-r from-orange-400 to-amber-400`
- 积分数：`bg-gradient-to-r from-emerald-400 to-green-400`
- 成功提示：`text-emerald-400 bg-emerald-900/30`
- 警告提示：`text-orange-400 bg-orange-900/30`

### 背景色：深色系统

**用途**：页面背景、卡片、容器

```css
gray-950: #030712  /* 最深背景 */
gray-900: #111827  /* 主背景 */
gray-800: #1f2937  /* 卡片/输入框 */
gray-700: #374151  /* 边框 */
```

**常用组合**：
- 页面背景：`bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950`
- 卡片背景：`bg-gradient-to-br from-gray-900 to-gray-800`
- 导航栏：`bg-gray-900/80 backdrop-blur-sm`
- 输入框：`bg-gray-800 border border-gray-700`

### 文字颜色

```css
white:    #ffffff  /* 主标题 */
gray-200: #e5e7eb  /* 正文（亮） */
gray-300: #d1d5db  /* 正文（标准） */
gray-400: #9ca3af  /* 次要文字 */
gray-500: #6b7280  /* 提示文字 */
gray-600: #4b5563  /* 禁用文字 */
```

### ❌ 禁止使用的颜色

**不要使用以下颜色**（用户反馈：视觉疲劳）：
- ❌ `purple-*` / `retro-purple`
- ❌ `pink-*` / `retro-pink`
- ❌ `violet-*`

---

## 🧩 组件样式

### 按钮 (Button)

```jsx
// 主按钮
className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-6 py-3 rounded-lg transition-all font-medium"

// 次要按钮
className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-6 py-3 rounded-lg transition-all font-medium"

// 危险按钮
className="bg-red-900/30 hover:bg-red-900/40 border border-red-800/50 text-red-300 px-6 py-3 rounded-lg transition-all font-medium"
```

### 卡片 (Card)

```jsx
className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-gray-600 rounded-2xl p-6 shadow-xl transition-all"
```

### 输入框 (Input)

```jsx
// 正常状态
className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"

// 禁用状态
className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
```

### 标签 (Badge)

```jsx
// 博客标签
className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded text-xs font-pixel"

// 普通标签
className="inline-block px-2 py-0.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded text-xs"
```

### 导航栏 (Header)

```jsx
className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50"
```

---

## 🏷️ Logo 设计

### PixelDesk Logo

```jsx
<button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
  {/* Logo 图标 */}
  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  </div>

  {/* Logo 文字 */}
  <div className="flex flex-col">
    <span className="text-white font-bold text-lg">PixelDesk</span>
    <span className="text-gray-400 text-xs font-mono">Social Platform</span>
  </div>
</button>
```

**特点**：
- 图标：显示器/桌面 icon
- 渐变：cyan-500 → teal-500
- 阴影：青色光晕效果
- 文字：主标题 + 副标题结构

---

## 📐 设计规范

### 圆角 (Border Radius)

```css
rounded-lg:   8px   /* 小圆角 - 按钮、输入框 */
rounded-xl:   12px  /* 中圆角 - 卡片、模态框 */
rounded-2xl:  16px  /* 大圆角 - 大卡片 */
```

### 阴影 (Shadow)

```css
shadow-lg              /* 标准阴影 */
shadow-xl              /* 悬停阴影 */
shadow-lg shadow-cyan-500/20  /* 青色光晕 */
```

### 间距 (Spacing)

使用 Tailwind 默认间距系统：
- `p-4` (16px), `p-6` (24px), `p-8` (32px)
- `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)

### 过渡动画 (Transitions)

```css
transition-all duration-300 ease-in-out
```

### 字体 (Typography)

```css
font-bold    /* 标题 */
font-medium  /* 按钮 */
font-normal  /* 正文 */
font-mono    /* 代码、时间戳 */
```

---

## 📱 响应式设计

```jsx
// 移动端优先
className="text-sm md:text-base lg:text-lg"
className="px-4 md:px-6 lg:px-8"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## ✨ 交互效果

### 悬停 (Hover)

```css
hover:opacity-80        /* Logo、图片 */
hover:text-cyan-400     /* 链接 */
hover:bg-gray-700       /* 按钮 */
hover:border-gray-600   /* 卡片 */
hover:scale-105         /* 轻微放大 */
```

### 激活 (Active)

```css
active:scale-95         /* 点击缩小 */
```

### 焦点 (Focus)

```css
focus:outline-none
focus:ring-2 focus:ring-cyan-500
focus:border-transparent
```

---

## 🎯 使用建议

### ✅ 推荐做法

1. **保持一致性**：使用预定义的组件样式
2. **渐变效果**：主要交互元素使用 cyan → teal 渐变
3. **深色主题**：保持深色背景，确保对比度
4. **光晕效果**：重要元素添加青色阴影增强视觉
5. **过渡动画**：所有交互都加上平滑过渡

### ❌ 避免做法

1. ❌ 不要使用紫色/粉色系配色
2. ❌ 不要使用过于鲜艳的颜色
3. ❌ 不要混用太多不同的颜色
4. ❌ 不要忽略深色背景下的对比度
5. ❌ 不要使用过多的动画效果

---

## 📝 更新日志

- **2025-01-31**: 初始版本创建
  - 定义蓝绿色系为主色调
  - 明确禁止使用紫色系
  - 统一 Logo 设计规范

---

## 🔗 相关文件

- 配置文件：`.claude/design-preferences.json`
- Tailwind 配置：`tailwind.config.js`
- 全局样式：`app/globals.css`

---

**维护者**：请在进行任何视觉设计修改时参考本文档，确保设计一致性。
