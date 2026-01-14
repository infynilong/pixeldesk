# 昼夜系统使用文档

## 🌓 系统概述

昼夜系统现在对 **background 和 tree 图块层**应用夜晚效果,而不影响其他层(角色、建筑物等),实现更精准的视觉效果。

## ✨ 核心特性

- ⏰ **基于真实时间**: 自动根据本地时间切换昼夜
- 🎨 **精准控制**: 只对 background 和 tree 图块层应用夜晚滤镜
- 🌊 **平滑过渡**: 2秒渐变动画,无突兀感
- 🎛️ **可配置**: 支持自定义时间段、色调、透明度
- 🔄 **自动检测**: 每分钟检查一次时间变化

## 🎨 视觉效果

### 白天 (6:00 - 20:00)
- background 和 tree 层正常显示,无滤镜
- 其他层(角色、建筑)不受影响

### 夜晚 (20:00 - 6:00)
- background 和 tree 层应用深蓝紫色色调 (`0x3030aa`)
- 透明度降低到 70% (`alpha: 0.7`)
- 其他层(角色、建筑)完全不受影响,保持正常显示

## 🔧 配置说明

### 当前配置 (Start.js 第 3195-3202 行)

```javascript
this.dayNightManager = new DayNightManager(this, this.mapLayers, {
  nightStart: 20,           // 晚上8点开始
  nightEnd: 6,              // 早上6点结束
  transitionDuration: 2000, // 2秒过渡时间
  checkInterval: 60000,     // 每分钟检查一次
  nightTint: 0x3030aa,      // 夜晚色调(深蓝紫色)
  nightAlpha: 0.7           // 夜晚透明度(70%)
})
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `nightStart` | number | 20 | 夜晚开始时间(小时,24小时制) |
| `nightEnd` | number | 6 | 夜晚结束时间(小时,24小时制) |
| `transitionDuration` | number | 2000 | 过渡动画时长(毫秒) |
| `checkInterval` | number | 60000 | 时间检查间隔(毫秒) |
| `nightTint` | hex | 0x3030aa | 夜晚色调(十六进制颜色) |
| `nightAlpha` | number | 0.7 | 夜晚透明度(0-1) |

### 色调调整建议

```javascript
// 更亮的夜晚(淡蓝色)
nightTint: 0x5050cc
nightAlpha: 0.5

// 更暗的夜晚(深蓝色)
nightTint: 0x202080
nightAlpha: 0.8

// 月光效果(蓝白色)
nightTint: 0x4060cc
nightAlpha: 0.6

// 深夜效果(深紫蓝)
nightTint: 0x1a1a60
nightAlpha: 0.85
```

## 🎮 测试方法

### 方法 1: 修改系统时间
1. 修改电脑系统时间到晚上 20:00 之后
2. 刷新游戏页面
3. 观察 background 和 tree 层变暗变蓝,其他层正常

### 方法 2: 使用控制台命令(推荐)

打开浏览器控制台,输入以下命令:

```javascript
// 强制切换到夜晚
window.currentScene.dayNightManager.forceNight()

// 强制切换到白天
window.currentScene.dayNightManager.forceDay()

// 查看当前状态
window.currentScene.dayNightManager.isNightTime()

// 查看当前小时
window.currentScene.dayNightManager.getCurrentHour()

// 查看时间描述
window.currentScene.dayNightManager.getTimeDescription()
```

### 方法 3: 临时修改配置测试

在 Start.js 中临时修改配置:

```javascript
// 将夜晚改为 9:00-17:00 (白天工作时间测试)
this.dayNightManager = new DayNightManager(this, this.mapLayers, {
  nightStart: 9,   // 早上9点开始"夜晚"
  nightEnd: 17,    // 下午5点结束"夜晚"
  transitionDuration: 2000,
  checkInterval: 60000,
  nightTint: 0x3030aa,
  nightAlpha: 0.7
})
```

## 🐛 常见问题

### Q: 夜晚效果不够明显?
**A**: 调整配置:
```javascript
nightTint: 0x202080  // 更深的蓝色
nightAlpha: 0.85     // 更高的透明度
```

### Q: 夜晚太暗了,看不清?
**A**: 调整配置:
```javascript
nightTint: 0x5050cc  // 更亮的蓝色
nightAlpha: 0.5      // 更低的透明度
```

### Q: 过渡太快/太慢?
**A**: 调整 `transitionDuration`:
```javascript
transitionDuration: 4000  // 更慢(4秒)
transitionDuration: 1000  // 更快(1秒)
```

### Q: 其他层也变暗了?
**A**: 检查确认只有 background 和 tree 层被传入:
```javascript
// 正确: 传入 this.mapLayers (包含 background 和 tree)
new DayNightManager(this, this.mapLayers, config)

// 错误: 不要传入其他游戏对象
```

### Q: 想要添加或移除影响的图层?
**A**: 修改 DayNightManager.js 中的 `layersToProcess` 数组:
```javascript
// 在 transitionToNight() 和 transitionToDay() 方法中
const layersToProcess = ['background', 'tree']  // 添加或移除图层名称
```

### Q: 想要只影响特定图块?
**A**: 当前版本整个图层会被统一处理。如果需要更精细的控制,可以考虑:
1. 将图层拆分为多个子图层
2. 在 DayNightManager 中添加更细粒度的控制逻辑

## 📊 性能影响

优化后的昼夜系统性能影响极小:

- ✅ **不使用额外的遮罩层**: 减少渲染负担
- ✅ **只修改两个图块层**: 最小化状态变化
- ✅ **使用 Tween 动画**: Phaser 内置优化
- ✅ **低频检测**: 每分钟只检查一次

## 🔄 技术实现

### DayNightManager.js

```javascript
transitionToNight() {
  // 对 background 和 tree 层应用夜晚滤镜
  const layersToProcess = ['background', 'tree']

  layersToProcess.forEach(layerName => {
    if (this.layers[layerName]) {
      this.scene.tweens.add({
        targets: this.layers[layerName],
        alpha: this.config.nightAlpha,
        duration: this.config.transitionDuration,
        ease: 'Sine.easeInOut',
        onStart: () => {
          // 设置夜晚色调
          this.layers[layerName].setTint(this.config.nightTint)
        }
      })
    }
  })
}

transitionToDay() {
  // 恢复 background 和 tree 层到白天状态
  const layersToProcess = ['background', 'tree']

  layersToProcess.forEach(layerName => {
    if (this.layers[layerName]) {
      this.scene.tweens.add({
        targets: this.layers[layerName],
        alpha: 1.0,
        duration: this.config.transitionDuration,
        ease: 'Sine.easeInOut',
        onStart: () => {
          // 清除色调
          this.layers[layerName].clearTint()
        }
      })
    }
  })
}
```

### Start.js 集成

```javascript
// 创建图块层
this.mapLayers = this.createTilesetLayers(map)

// 创建昼夜管理器,传入 layers
this.dayNightManager = new DayNightManager(this, this.mapLayers, config)
```

## 📝 更新日志

### 2026-01-06 v2.1
- ✨ 扩展昼夜系统,同时影响 background 和 tree 图块层
- 📝 更新文档,说明多图层处理

### 2026-01-06 v2.0
- ✨ 重构昼夜系统,只影响 background 图块层
- 🗑️ 移除全屏遮罩层(nightOverlay)
- 🗑️ 移除室内外检测逻辑
- 🎨 使用 Phaser Tint + Alpha 实现夜晚效果
- ⚡ 性能显著提升

### v1.0 (之前版本)
- 使用全屏 Graphics 遮罩层
- 包含室内外检测功能
- 影响所有游戏对象

## 🚀 未来改进

可选的增强功能:

1. **时间段细分**: 早晨、中午、傍晚、深夜不同色调
2. **天气系统**: 雨天、阴天额外滤镜
3. **季节变化**: 春夏秋冬不同色调
4. **动态光源**: 路灯、窗户光效
5. **星空背景**: 夜晚添加星星粒子效果

---

**文档更新**: 2026-01-06
**系统版本**: v2.1 (Background + Tree Layers)
