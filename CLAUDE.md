# Claude AI 开发规范

本文档记录了在 PixelDesk 项目中使用 Claude AI 辅助开发时必须遵守的规范和注意事项。

---

## 🚨 弹窗（Modal）组件开发规范

### 问题描述
在 Phaser 游戏场景中使用弹窗时，存在**点击穿透**问题：点击弹窗区域会同时触发底层 Phaser 游戏元素的点击事件。

### 解决方案

每个弹窗组件必须实现以下两层事件阻止：

#### 1. 遮罩层（Backdrop）- 外层 div
```tsx
<div
  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onClick={onClose}  // 点击遮罩关闭弹窗
  onMouseDown={(e) => e.stopPropagation()}
  onMouseUp={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
  onPointerUp={(e) => e.stopPropagation()}
  style={{ pointerEvents: 'auto' }}  // 确保可以接收鼠标事件
>
```

#### 2. 内容容器 - 内层 div
```tsx
<div
  className="relative ..."
  onClick={(e) => e.stopPropagation()}  // 阻止冒泡到遮罩层
  onMouseDown={(e) => e.stopPropagation()}
  onMouseUp={(e) => e.stopPropagation()}
  onPointerDown={(e) => e.stopPropagation()}
  onPointerUp={(e) => e.stopPropagation()}
>
  {/* 弹窗内容 */}
</div>
```

### 为什么需要这么多事件处理？

- **onClick**: 处理点击事件
- **onMouseDown/onMouseUp**: 处理鼠标按下/释放事件
- **onPointerDown/onPointerUp**: 处理触摸和鼠标指针事件（兼容触摸屏）
- **stopPropagation()**: 阻止事件冒泡到 Phaser 游戏层
- **pointerEvents: 'auto'**: 确保遮罩层可以接收所有指针事件

### 标准 Modal 组件

推荐使用项目中的通用 Modal 组件：

```tsx
import Modal from '@/components/common/Modal'

<Modal isOpen={isOpen} onClose={handleClose}>
  <div className="bg-white p-6 rounded">
    你的内容
  </div>
</Modal>
```

该组件已经包含了所有必要的事件阻止逻辑。

### ✅ 检查清单

创建或修改弹窗组件时，必须检查：

- [ ] 遮罩层添加了所有5个事件处理函数
- [ ] 内容容器添加了所有5个事件处理函数
- [ ] 遮罩层设置了 `pointerEvents: 'auto'`
- [ ] 测试在 Phaser 场景中点击弹窗不会触发底层元素

### 已修复的组件

- ✅ [AuthModal.tsx](components/AuthModal.tsx) - 登录/注册弹窗
- ✅ [PostDetailModal.tsx](components/PostDetailModal.tsx) - 帖子详情弹窗

---

## ⌨️ 输入框键盘事件处理规范

### 问题描述
在 Phaser 游戏中使用输入框（input/textarea）时，输入的字符（如 WASD）会同时触发游戏角色的移动，因为键盘事件会冒泡到 Phaser 游戏层。

### 解决方案

所有在弹窗或 UI 组件中的输入框，必须正确处理键盘事件，阻止事件冒泡到 Phaser：

#### 1. 输入框事件处理
在 `onKeyDown` 事件处理函数中必须使用 `e.stopPropagation()`：

```tsx
// ❌ 错误示例 - 没有阻止事件冒泡
const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSend()
  }
}

// ✅ 正确示例 - 阻止事件冒泡到 Phaser
const handleKeyPress = (e: React.KeyboardEvent) => {
  // 使用 stopPropagation 阻止事件冒泡到 Phaser
  e.stopPropagation()

  if (e.key === 'Enter') {
    e.preventDefault()
    handleSend()
  }
}
```

#### 2. 输入框组件绑定
在输入框组件上绑定事件处理函数：

```tsx
<input
  type="text"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  onKeyPress={handleKeyPress}  // 处理 Enter 键发送
  onKeyDown={handleInputKeyDown}  // 处理其他键盘事件
  // 其他属性...
/>
```

#### 3. FocusManager 集成（可选）
项目中已经实现了 `FocusManager`（[PixelDesk/src/logic/FocusManager.js](PixelDesk/src/logic/FocusManager.js)），它会自动检测输入框焦点并禁用 Phaser 键盘输入：

```tsx
// 自动聚焦输入框时，FocusManager 会自动处理
useEffect(() => {
  if (isOpen && inputRef.current) {
    // 延迟一点，等弹窗完全显示后再对焦
    setTimeout(() => inputRef.current?.focus(), 100)
  }
}, [isOpen])
```

### 为什么会这样？

- **事件冒泡**：键盘事件默认会向父元素冒泡，最终到达 document 对象
- **Phaser 监听**：Phaser 在 document 上监听键盘事件来控制角色移动
- **stopPropagation()**：阻止事件继续向上冒泡，Phaser 就收不到键盘事件

### ✅ 键盘处理检查清单

创建或修改包含输入框的组件时，必须检查：

- [ ] 所有键盘事件处理函数（onKeyDown/onKeyPress）都调用了 `e.stopPropagation()`
- [ ] 输入框在组件挂载时自动聚焦（使用 setTimeout 延迟）
- [ ] 按 Enter 键发送消息时正确处理
- [ ] 按 ESC 键关闭弹窗时阻止事件冒泡
- [ ] 测试可以在输入框中正常输入 WASD 等游戏按键

### 📌 特殊按键处理

对于 WASD、方向键等游戏控制按键：

```tsx
const handleInputKeyDown = (e: React.KeyboardEvent) => {
  // 阻止所有键盘事件冒泡
  e.stopPropagation()

  // 处理 ESC 键关闭弹窗
  if (e.key === 'Escape') {
    e.preventDefault()
    onClose()
  }

  // 处理 Enter 键发送消息
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }

  // 其他按键（WASD）已经被 stopPropagation 阻止，不会触发游戏移动
}
```

### 已正确实现的组件

- ✅ [AiChatModal.tsx](components/AiChatModal.tsx) - AI NPC 聊天窗口
- ✅ [FrontDeskChatModal.tsx](components/FrontDeskChatModal.tsx) - 前台客服聊天窗口
- ✅ [WorkstationBindingModal.tsx](components/WorkstationBindingModal.tsx) - 工位绑定弹窗

---

## 📝 其他开发规范

（待补充...）
