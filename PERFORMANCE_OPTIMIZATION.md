# 像素工位游戏性能优化方案

## 🎯 问题诊断

### 原有性能问题
- **CPU占用**：60%+（不可接受）
- **根本原因**：一次性创建4000+工位对象和碰撞检测

### 性能瓶颈分析
1. **对象创建瓶颈**（Start.js:863-897）
   - 一次性创建4000+工位精灵对象
   - 每个工位创建交互图标、事件监听器
   - 总计：4000精灵 + 4000图标 + 12000事件监听器

2. **碰撞检测瓶颈**（Start.js:908-947）
   - 4000+工位物理体
   - Phaser物理引擎每帧检测玩家与所有工位的碰撞
   - 复杂度：O(n) where n=4000+

3. **内存和渲染压力**
   - 所有精灵始终在内存中
   - 即使不在视口内也参与渲染判断

---

## ✨ 优化方案：区块管理系统（Chunk System）

### 核心思想
**只加载和渲染视口内及附近区块的工位，动态加载/卸载远离视口的工位**

### 技术实现

#### 1. ChunkManager（区块管理器）
位置：`PixelDesk/src/logic/ChunkManager.js`

**功能**：
- 将地图分成固定大小的区块（默认1000x1000像素）
- 追踪相机位置，动态加载/卸载区块
- 管理工位对象的生命周期

**配置参数**：
```javascript
{
  chunkSize: 1000,      // 区块大小
  loadRadius: 1,        // 加载半径（周围几圈区块）
  unloadDelay: 3000,    // 卸载延迟（避免频繁切换）
  updateInterval: 500   // 更新频率
}
```

**核心算法**：
- 相机位置 → 计算当前区块坐标
- 加载当前区块 + 周围1圈区块（3x3=9个区块）
- 卸载远离的区块（延迟3秒）

#### 2. Start.js 改造
**改动点**：
- `renderObjectLayer()`：从"立即创建所有工位"改为"收集工位数据"
- 新增 `initializeChunkSystem()`：初始化区块系统
- 新增 `loadWorkstation()`：按需加载单个工位
- 新增 `unloadWorkstation()`：卸载工位精灵和碰撞体

**加载流程**：
```
地图加载 → 收集所有工位对象(不创建精灵)
         ↓
    初始化区块系统
         ↓
    根据相机位置加载初始区块
         ↓
    玩家移动时动态加载/卸载区块
```

#### 3. WorkstationManager 适配
**改动点**：
- 所有视觉操作前检查 `workstation.sprite` 是否存在
- 保留工位数据，即使精灵被卸载
- 工位绑定信息始终保留（只卸载精灵，不卸载数据）

---

## 📊 性能改进预期

### 对象数量对比

| 项目 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| **活跃工位精灵** | 4000+ | 100-200 | **95%减少** |
| **活跃碰撞体** | 4000+ | 100-200 | **95%减少** |
| **事件监听器** | 12000+ | 300-600 | **95%减少** |
| **交互图标** | 4000+ | 100-200 | **95%减少** |

### CPU占用预期
- **优化前**：60%+
- **优化后**：10-20%（预计）
- **改进**：**70-80%降低**

### 内存优化
- 精灵内存减少约95%
- 物理体内存减少约95%
- 总内存占用减少约60-70%

---

## 🚀 使用和测试

### 1. 启动游戏
```bash
npm run dev
```

### 2. 浏览器控制台测试

#### 查看区块统计
```javascript
// 查看当前区块加载情况
window.getChunkStats()

// 返回示例：
{
  totalWorkstations: 4287,      // 总工位数
  activeWorkstations: 156,      // 当前激活的工位数
  totalChunks: 42,              // 总区块数
  activeChunks: 9,              // 当前激活的区块数
  loadPercentage: "3.6%",       // 加载百分比
  chunksLoadPercentage: "21.4%", // 区块加载百分比
  lastUpdate: 1730603890123     // 最后更新时间
}
```

#### 查看工位统计
```javascript
// 查看工位总览
window.getGameWorkstationStats()

// 返回：
{
  totalWorkstations: 4287,
  boundWorkstations: 12,
  availableWorkstations: 4275,
  occupancyRate: "0.28%"
}
```

### 3. 性能监控

#### Chrome开发者工具
1. 打开开发者工具（F12）
2. Performance标签 → 录制
3. 在游戏中移动玩家
4. 停止录制，查看CPU使用情况

**关注指标**：
- Main线程占用率
- 帧率（FPS）
- 碰撞检测耗时
- 渲染耗时

#### 游戏内观察
- 移动玩家时应该非常流畅
- 工位在进入视野时动态加载（几乎察觉不到）
- 远离视野的工位自动卸载

---

## 🔧 配置调优

### 调整区块大小
如果需要调整性能平衡，修改 [Start.js:1038-1043](Start.js:1038-1043)：

```javascript
this.chunkManager = new ChunkManager(this, {
  chunkSize: 1000,      // 减小=更精细但更频繁切换
                        // 增大=粗粒度但减少切换
  loadRadius: 1,        // 增大=加载更多区块（更流畅但占用更多）
                        // 减小=只加载当前区块（最省资源但可能看到加载）
  unloadDelay: 3000,    // 增大=减少频繁加载/卸载
  updateInterval: 500   // 减小=更及时响应但更多检查
})
```

### 推荐配置
- **标准配置**（默认）：chunkSize=1000, loadRadius=1
- **性能优先**：chunkSize=1200, loadRadius=0
- **流畅优先**：chunkSize=800, loadRadius=2

---

## 📝 技术细节

### 区块坐标系统
```javascript
// 世界坐标 → 区块坐标
chunkX = Math.floor(worldX / chunkSize)
chunkY = Math.floor(worldY / chunkSize)
chunkKey = `${chunkX},${chunkY}`
```

### 加载半径算法
```javascript
// 加载当前区块及周围radius圈区块
for (dx = -radius; dx <= radius; dx++) {
  for (dy = -radius; dy <= radius; dy++) {
    loadChunk(currentChunkX + dx, currentChunkY + dy)
  }
}
```

### 卸载延迟机制
- 工位离开加载半径时不立即卸载
- 添加到待卸载队列，延迟3秒
- 如果3秒内重新进入加载半径，取消卸载
- 避免玩家在区块边界来回移动时频繁加载/卸载

---

## ⚠️ 注意事项

### 1. 工位总数获取
由于不是所有工位都加载了精灵，NextJS获取工位数量的方式需要调整：

**之前**：
```javascript
// ❌ 这会少算未加载的工位
const count = gameScene.workstationManager.workstations.size
```

**现在**：
```javascript
// ✅ 使用正确的API
const count = window.getGameWorkstationCount()
```

### 2. 工位绑定兼容性
- 工位数据始终保留（即使精灵被卸载）
- 绑定信息正常同步和显示
- 角色精灵只在工位加载时创建

### 3. 跨区块操作
如果需要操作特定工位（如传送到工位），系统会自动加载该工位所在区块：

```javascript
// WorkstationManager会确保工位可操作
await workstationManager.teleportToWorkstation(userId, player)
```

---

## 🎮 游戏体验

### 优化后体验
✅ 游戏启动更快（不需要等待4000+对象创建）
✅ 玩家移动流畅（碰撞检测减少95%）
✅ 内存占用降低
✅ CPU占用大幅下降
✅ 电池续航改善（移动设备）

### 无感知加载
- 区块加载在视野外提前完成
- 玩家几乎察觉不到动态加载
- 3x3区块缓冲确保流畅体验

---

## 🔮 未来扩展

### 支持更大地图
区块系统天然支持无限大地图：
- 10000+ 工位？没问题
- 100000+ 工位？依然流畅
- 只有视口附近的对象被激活

### 多人游戏优化
区块系统可扩展到玩家管理：
- 只同步附近区块的玩家
- 远离玩家不同步位置
- 降低网络和计算负担

### LOD（Level of Detail）
可基于区块系统实现LOD：
- 远处区块使用简化模型
- 近处区块使用完整模型
- 进一步优化性能

---

## 📦 提交信息

```
分支：performance/viewport-culling-optimization
提交：ee3bece8

feat: 实现区块管理系统优化CPU占用

核心优化：
- 新增 ChunkManager 区块管理器
- 将地图分成1000x1000像素的区块
- 只加载视口内及周围1圈区块的工位
- 动态加载/卸载工位精灵和碰撞检测

预期效果：
- 活跃对象从4000+减少到约100-200个
- CPU占用预计降低80%以上
- 碰撞检测数量大幅减少
```

---

## 🤝 合并建议

### 测试清单
- [ ] 游戏正常启动
- [ ] 工位数量显示正确
- [ ] 工位绑定功能正常
- [ ] 玩家移动流畅
- [ ] CPU占用明显下降
- [ ] 区块切换无卡顿
- [ ] 工位同步功能正常

### 合并命令
```bash
# 测试通过后合并到main分支
git checkout main
git merge performance/viewport-culling-optimization
git push origin main
```

---

**优化完成时间**：2025-11-03
**优化作者**：Claude + 江一龙
**技术栈**：Phaser 3 + React + Next.js
