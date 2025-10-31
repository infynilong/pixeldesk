# Claude Code 项目配置

本目录包含 PixelDesk 项目的 Claude Code 配置和偏好设置。

## 📁 文件说明

### `design-preferences.json`
**用途**：完整的设计系统配置文件（JSON 格式）

包含：
- 详细的配色方案定义
- 组件样式规范
- Logo 设计规范
- 禁止使用的颜色列表

**适合**：程序读取、自动化工具使用

---

### `quick-reference.md`
**用途**：开发时的快速参考指南

包含：
- 常用 Tailwind 类名速查
- 最常用的配色组合
- 快速记忆要点

**适合**：开发时快速查阅

---

## 📚 相关文档

### 项目根目录的 `DESIGN_SYSTEM.md`
完整的设计系统文档，包含：
- 详细的配色说明和示例
- 所有组件的样式规范
- 响应式设计指南
- 使用建议和避免事项

**适合**：深入了解设计系统、做出设计决策时参考

---

### `tailwind.config.js`
Tailwind CSS 配置文件，已添加：
- 配色方案注释
- 不推荐使用的颜色标注
- 自定义颜色定义

---

## 🎯 如何使用

### 开发新功能时

1. **快速查阅**：打开 `quick-reference.md` 查看常用类名
2. **详细参考**：查看根目录的 `DESIGN_SYSTEM.md`
3. **复制组件**：从现有页面复制相似的组件样式

### 与 Claude Code 对话时

在新的对话中提醒 Claude：

```
请参考项目中的 DESIGN_SYSTEM.md 和 .claude/design-preferences.json，
使用蓝绿色系（cyan/teal）作为主色调，避免使用紫色和粉色。
```

或者简单说：

```
请遵循项目的设计规范，使用定义好的配色方案。
```

### AI 自动识别

Claude Code 会自动读取：
- `.claude/` 目录中的配置文件
- 项目根目录的设计文档

在新对话中，Claude 应该能够自动识别并遵循这些设计规范。

---

## 🔄 更新配置

如果需要修改配色方案：

1. 更新 `.claude/design-preferences.json`（结构化数据）
2. 更新 `DESIGN_SYSTEM.md`（详细文档）
3. 更新 `quick-reference.md`（快速参考）
4. 在 `tailwind.config.js` 添加相应注释

保持所有文档同步更新！

---

## 💡 提示

- 这些配置文件应该提交到 Git 仓库
- 团队成员都应该遵循这些规范
- Claude Code 会在对话时参考这些文件
- 定期审查和更新设计规范

---

**最后更新**：2025-01-31
**维护者**：项目团队
