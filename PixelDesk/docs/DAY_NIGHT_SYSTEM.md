# 昼夜系统使用文档

## 功能概述

PixelDesk 现在支持基于真实时间的昼夜系统，会根据当前时间自动切换白天和夜晚模式。

**✨ 新功能**: 室内外区分 - 室内区域不显示夜晚效果，只有室外区域会变暗！

## 默认配置

- **夜晚时段**: 20:00 - 6:00（晚上8点到早上6点）
- **白天时段**: 6:00 - 20:00（早上6点到晚上8点）
- **过渡时间**: 2秒平滑过渡
- **检查间隔**: 每分钟检查一次时间变化
- **室内外检测**: 每500ms检查一次玩家位置

## 夜晚效果

### 室外区域
夜晚模式会在游戏画面上添加一层深蓝色的半透明遮罩（70%透明度），使用 Phaser Graphics 对象绘制，效果明显且性能优秀。

### 室内区域
室内区域完全不显示夜晚效果（遮罩透明度为0），玩家进入室内时会平滑过渡，就像进入了灯火通明的建筑。

## 调试命令

在浏览器控制台中可以使用以下命令进行测试：

### 昼夜切换命令

```javascript
// 强制切换到夜晚模式
window.forceNight()
// 返回: "🌙 已强制切换到夜晚模式" 或 "🌙 当前已经是夜晚模式"

// 强制切换到白天模式
window.forceDay()
// 返回: "☀️ 已强制切换到白天模式" 或 "☀️ 当前已经是白天模式"

// 查询当前是否是夜晚
window.isNight()
// 返回: true (夜晚) 或 false (白天)

// 获取当前时间描述
window.getTimeDescription()
// 返回: "早晨"、"中午"、"下午"、"傍晚" 或 "夜晚"
```

### 室内外区域命令

```javascript
// 查询玩家是否在室内
window.isPlayerIndoor()
// 返回: true (室内) 或 false (室外)

// 动态添加室内区域（用于测试和调试）
// 参数: x, y, width, height, name
window.addIndoorArea(500, 500, 800, 600, '办公室主区域')
// 返回: 添加成功的日志信息

// 示例：站在当前位置添加一个室内区域
const player = window.game.scene.scenes[0].player
window.addIndoorArea(player.x - 200, player.y - 200, 400, 400, '测试室内区域')
```

## 自定义配置

### 修改昼夜时间段

在 `Start.js` 的 `initializeDayNightSystem()` 方法中修改配置：

```javascript
this.dayNightManager = new DayNightManager(this, {
  nightStart: 20,  // 夜晚开始时间（小时）
  nightEnd: 6,     // 夜晚结束时间（小时）
  transitionDuration: 2000, // 过渡动画时长（毫秒）
  checkInterval: 60000 // 检查间隔（毫秒）
})
```

### 定义室内区域

有三种方式定义室内区域：

#### 1. 在代码中手动定义（推荐用于固定区域）

在 `Start.js` 的 `initializeDayNightSystem()` 方法中：

```javascript
this.indoorAreasManager.defineIndoorAreas([
  { x: 500, y: 500, width: 800, height: 600, name: '办公室主区域' },
  { x: 1400, y: 500, width: 400, height: 400, name: '会议室' },
  { x: 200, y: 1000, width: 600, height: 500, name: '休息区' }
])
```

#### 2. 从 Tiled 地图加载（推荐用于复杂区域）

1. 在 Tiled 编辑器中创建一个对象层，命名为 `indoor-areas`
2. 使用矩形工具在室内区域绘制矩形
3. 给每个矩形命名（可选）
4. 在 `Start.js` 中启用加载：

```javascript
// 取消注释这一行
this.indoorAreasManager.loadFromTiledMap('indoor-areas')
```

#### 3. 运行时动态添加（推荐用于调试）

在浏览器控制台中：

```javascript
// 方法1：直接指定坐标
window.addIndoorArea(500, 500, 800, 600, '办公室')

// 方法2：基于玩家当前位置
const player = window.game.scene.scenes[0].player
window.addIndoorArea(player.x - 200, player.y - 200, 400, 400, '当前位置')
```

## 技术实现

### DayNightManager.js
负责时间判断和状态管理：
- 基于系统时间判断当前是白天还是夜晚
- 提供状态查询接口
- 触发昼夜切换事件

### IndoorAreasManager.js
负责室内区域管理：
- 定义和存储室内区域坐标
- 检测玩家是否在室内
- 支持从 Tiled 地图或代码配置加载
- 提供调试工具（可视化绘制区域）

### Start.js 中的集成
负责视觉效果的实现：
- 创建夜晚遮罩层（使用 Phaser.Graphics 对象）
- 监听昼夜切换事件
- 执行平滑的透明度过渡动画
- 每500ms检测玩家位置，动态调整遮罩透明度

## 性能优化

- 遮罩层固定在相机上（`setScrollFactor(0)`），不会随地图滚动
- 使用 Phaser Tween 实现高效的动画过渡
- 使用 Graphics 对象一次性绘制，无需每帧重绘
- 时间检查间隔为1分钟，CPU占用可忽略

## 未来扩展

可以基于这个系统添加更多功能：

1. **月亮和星星**: 夜晚时显示月亮和星星
2. **工位灯光**: 夜晚时工位自动开灯
3. **光源系统**: 使用 Phaser Light2D 添加动态光照
4. **时间显示**: 在 UI 上显示当前游戏时间
5. **昼夜变化通知**: 在切换时显示提示消息

## 示例效果

```
[白天] -> 傍晚 (18:00-20:00) -> [夜晚] -> 清晨 (6:00-8:00) -> [白天]
         ↓                        ↓                          ↓
      渐变过渡                 2秒过渡                    2秒过渡
```

## 注意事项

1. 昼夜系统基于用户本地时间，不同时区的用户会看到不同的昼夜状态
2. 如果需要服务器统一时间，需要修改 `DayNightManager` 从服务器获取时间
3. 遮罩层在 Z 轴深度为 10000，确保显示在所有游戏元素之上
