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

## 📝 其他开发规范

（待补充...）
