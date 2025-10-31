# 设计规范提示词

当你在 PixelDesk 项目中开发任何 UI 功能时，请遵循以下规范：

## 🎨 配色方案

**主色调**：蓝绿色系
- 使用 `cyan-*` 和 `teal-*` 作为主要交互色
- 按钮渐变：`from-cyan-600 to-teal-600`
- 悬停效果：`hover:from-cyan-500 hover:to-teal-500`

**强调色**：橙色和翠绿色
- 橙色 `orange-*`：用于获赞、警告等
- 翠绿色 `emerald-*`：用于积分、成功状态

**背景**：深色系统
- 页面背景：`from-gray-950 via-gray-900 to-gray-950`
- 卡片背景：`from-gray-900 to-gray-800`

**❌ 严格禁止使用**：
- `purple-*`
- `pink-*`
- `violet-*`
- `retro-purple`
- `retro-pink`

原因：用户明确表示"看吐了"

## 📋 开发检查清单

开发新功能时，确保：

- [ ] 使用蓝绿色系（cyan/teal）作为主色
- [ ] 没有使用任何紫色/粉色
- [ ] 深色背景（gray-950/900/800）
- [ ] 文字对比度良好（white/gray-200）
- [ ] Logo 统一使用 PixelDesk 设计
- [ ] 过渡动画流畅（transition-all）
- [ ] 圆角统一（rounded-lg/xl/2xl）

## 📚 详细文档

查看完整设计规范：
- **完整文档**：`/DESIGN_SYSTEM.md`
- **配置文件**：`.claude/design-preferences.json`
- **快速参考**：`.claude/quick-reference.md`

---

**记住**：保持设计一致性，避免使用紫色！
