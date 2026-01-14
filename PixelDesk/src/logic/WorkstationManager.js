import { Player } from '../entities/Player.js';
// 缓存系统已永久禁用 - 2025-09-19 修复缓存导致的玩家显示问题
// 问题：复杂的缓存系统(WorkstationBindingCache, localStorage, Redis)导致数据不一致
// 解决：完全禁用所有缓存，每次都从数据库获取最新数据
// import { WorkstationBindingCache, AdaptiveDebounce } from '../cache/WorkstationBindingCache.js';

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
    // 临时启用日志用于调试工位角色显示问题
    ENABLE_DEBUG_LOGGING: true,
    // 关键错误和警告仍然显示
    ENABLE_ERROR_LOGGING: true
}

// 性能优化的日志系统
const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }

export class WorkstationManager {
    constructor(scene) {
        this.scene = scene;
        this.workstations = new Map(); // 存储工位信息：id -> workstation对象
        this.userBindings = new Map();  // 存储用户绑定：workstationId -> userId

        // 完全禁用视口优化和缓存系统
        this.bindingCache = null;
        this.adaptiveDebounce = null;
        this.currentViewport = null;

        // 清理初始化时的userBindings，避免遗留数据问题
        this.cleanupUserBindings();
        this.viewportUpdateDebounce = null;
        this.isViewportOptimizationEnabled = false; // 永久禁用

        this.config = {
            occupiedTint: 0x888888,    // 其他用户占用工位的颜色 (灰色)
            userOwnedTint: 0xFFD700,   // 当前用户工位的颜色 (金黄色 - 高贵醒目)
            expiringSoonTint: 0xff6b00, // 即将过期工位的颜色 (橙色警告)
            highlightTint: 0xffff00,   // 高亮颜色
            highlightDuration: 500,    // 高亮持续时间
            debugBounds: false,        // 是否显示调试边界

            // 视口优化配置
            viewportBuffer: 100,       // 视口缓冲区大小(像素)
            minMoveDistance: 50,       // 最小移动距离才触发更新
            debounceDelay: 500         // 防抖延迟(毫秒)
        };

        // 轮询配置
        this.pollingTimer = null;
        this.pollingInterval = 30000; // 默认30秒轮询一次，平衡实时性与性能

        // 并发控制
        this.syncPromise = null;
    }

    // 通用的场景有效性检查方法
    isSceneValid() {
        try {
            if (!this.scene) return false;
            if (!this.scene.add) return false;
            if (!this.scene.scene) return false;
            if (typeof this.scene.scene.isActive !== 'function') return false;
            return this.scene.scene.isActive();
        } catch (error) {
            debugWarn('Scene validity check failed:', error);
            return false;
        }
    }

    // ===== 工位创建和管理 =====
    createWorkstation(tiledObject, sprite) {
        // 检测工位方向 (传入对象和精灵以进行多维度判断)
        const direction = this.detectWorkstationDirection(tiledObject, sprite);

        const workstation = {
            id: tiledObject.id,
            sprite: sprite,
            position: { x: tiledObject.x, y: tiledObject.y },
            size: { width: tiledObject.width || 48, height: tiledObject.height || 48 },
            type: tiledObject.type || 'desk',
            name: tiledObject.name || '',
            direction: direction,
            isOccupied: false,
            userId: null,
            createdAt: Date.now(),
            metadata: this.extractMetadata(tiledObject),
            interactionIcon: null // 交互图标
        };

        this.workstations.set(tiledObject.id, workstation);
        this.setupInteraction(workstation);

        // debugLog(`Created workstation with ID: ${tiledObject.id}`, workstation);
        return workstation;
    }

    extractMetadata(tiledObject) {
        // 提取 Tiled 对象的自定义属性
        const metadata = {};
        if (tiledObject.properties) {
            tiledObject.properties.forEach(prop => {
                metadata[prop.name] = prop.value;
            });
        }
        return metadata;
    }

    detectWorkstationDirection(tiledObject, sprite) {
        // 1. 优先从 Tiled 对象的名称或类型检测
        const name = tiledObject.name || tiledObject.type || '';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('_right')) return 'right';
        if (lowerName.includes('_left')) return 'left';
        if (lowerName.includes('_up')) return 'up';
        if (lowerName.includes('center')) return 'center';
        if (lowerName.includes('single')) return 'single';

        // 2. 其次从贴图 Key 检测 (更可靠的后备方案)
        if (sprite && sprite.texture) {
            const textureKey = sprite.texture.key.toLowerCase();
            if (textureKey.includes('_right')) return 'right';
            if (textureKey.includes('_left')) return 'left';
            if (textureKey.includes('_up')) return 'up';
        }

        // 3. 默认根据宽度推断：宽度大于高度通常是并排桌子
        if (tiledObject.width > tiledObject.height * 1.5) return 'center';

        return 'single';
    }

    setupInteraction(workstation) {
        // 区块系统：只有当sprite存在时才设置交互
        if (!workstation.sprite) {
            debugLog(`⚠️ 工位 ${workstation.id} 的sprite不存在，跳过交互设置（可能在未加载的区块中）`);
            return;
        }

        workstation.sprite.setInteractive();
        workstation.sprite.on('pointerdown', () => this.onWorkstationClick(workstation.id));
        workstation.sprite.on('pointerover', () => this.onWorkstationHover(workstation.id));
        workstation.sprite.on('pointerout', () => this.onWorkstationOut(workstation.id));

        // 🔧 修复：不再添加蓝色交互图标，减少视觉干扰
        // if (!workstation.isOccupied) {
        //     this.addInteractionIcon(workstation);
        // }
    }

    // ===== 事件处理 =====
    onWorkstationClick(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (workstation) {
            debugLog(`Clicked workstation ${workstationId}:`, workstation);
            debugLog(`User bound: ${this.getUserByWorkstation(workstationId) || 'None'}`);

            // 检查是否是书架
            if (workstation.sprite && workstation.sprite.texture.key.includes("bookcase")) {
                debugLog(`📚 点击书架 ${workstationId}，触发图书馆弹窗`);
                window.dispatchEvent(new CustomEvent('open-library', {
                    detail: {
                        bookcaseId: workstationId
                    }
                }));
                return; // 书架不执行后续工位逻辑
            }

            this.highlightWorkstation(workstationId);

            // 只有未占用的工位才触发绑定事件
            if (!workstation.isOccupied) {
                this.scene.events.emit('workstation-binding-request', {
                    workstationId,
                    workstation
                });
            } else {
                // 已占用的工位显示工位信息弹窗
                const userId = this.getUserByWorkstation(workstationId);
                if (userId) {
                    debugLog(`显示工位 ${workstationId} 的信息弹窗，用户ID: ${userId}`);

                    // 调用全局函数显示工位信息弹窗
                    if (typeof window !== 'undefined' && window.showWorkstationInfo) {
                        window.showWorkstationInfo(workstationId, userId);
                    }
                }
            }

            // 触发自定义事件
            this.scene.events.emit('workstation-clicked', {
                workstationId,
                workstation,
                userId: this.getUserByWorkstation(workstationId)
            });
        }
    }

    onWorkstationHover(workstationId) {
        this.scene.events.emit('workstation-hover', { workstationId });

        // Mobile Controls: Show Action Button
        if (this.scene.mobileControls) {
            this.scene.mobileControls.showActionButton();
        }
    }

    onWorkstationOut(workstationId) {
        this.scene.events.emit('workstation-out', { workstationId });

        // Mobile Controls: Hide Action Button
        if (this.scene.mobileControls) {
            this.scene.mobileControls.hideActionButton();
        }
    }

    highlightWorkstation(workstationId, duration = null) {
        const workstation = this.workstations.get(workstationId);
        if (workstation && workstation.sprite) {
            workstation.sprite.setTint(this.config.highlightTint);

            const highlightDuration = duration || this.config.highlightDuration;
            this.scene.time.delayedCall(highlightDuration, () => {
                this.restoreWorkstationTint(workstationId);
            });
        }
    }

    restoreWorkstationTint(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (workstation && workstation.sprite) {
            if (workstation.isOccupied) {
                workstation.sprite.setTint(this.config.occupiedTint);
            } else {
                workstation.sprite.clearTint();
            }
        }
    }

    // ===== 用户绑定管理 =====
    async bindUserToWorkstation(workstationId, userId, userInfo = {}) {
        const workstation = this.workstations.get(workstationId);
        if (!workstation) {
            debugWarn(`Workstation ${workstationId} not found`);
            return { success: false, error: 'Workstation not found' };
        }

        if (workstation.isOccupied) {
            debugWarn(`Workstation ${workstationId} is already occupied by user ${workstation.userId}`);
            return { success: false, error: 'Workstation already occupied' };
        }

        // 检查用户是否已经绑定到其他工位
        const existingWorkstation = this.getWorkstationByUser(userId);
        if (existingWorkstation) {
            debugWarn(`🚫 [bindUserToWorkstation] 用户 ${userId} 已绑定到工位 ${existingWorkstation.id}`);
            debugWarn(`🔍 [bindUserToWorkstation] 当前userBindings状态:`, Array.from(this.userBindings.entries()));
            return { success: false, error: 'User already bound to another workstation' };
        }
        debugLog(`✅ [bindUserToWorkstation] 用户 ${userId} 没有现有绑定，可以绑定到工位 ${workstationId}`);

        // 计算过期时间（30天后）
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 绑定用户
        workstation.isOccupied = true;
        workstation.userId = userId;
        workstation.userInfo = userInfo;
        workstation.boundAt = now.toISOString();
        workstation.expiresAt = expiresAt.toISOString();
        workstation.remainingDays = 30;

        this.userBindings.set(String(workstationId), userId);

        // 更新视觉效果
        if (workstation.sprite) {
            workstation.sprite.setTint(this.config.occupiedTint);
        }

        // 移除交互图标
        this.removeInteractionIcon(workstation);

        // 添加占用图标
        this.addOccupiedIcon(workstation);

        // 为当前用户的工位添加特殊高亮
        this.addUserWorkstationHighlight(workstation);

        // 在工位上显示角色形象
        debugLog(`👤 [bindUserToWorkstation] 即将调用 addCharacterToWorkstation`);
        this.addCharacterToWorkstation(workstation, userId, userInfo);
        debugLog(`👤 [bindUserToWorkstation] addCharacterToWorkstation 调用完成:`, {
            workstationHasCharacter: !!workstation.characterSprite,
            characterKey: workstation.characterKey,
            characterVisible: workstation.characterSprite?.visible,
            characterPosition: workstation.characterSprite ?
                { x: workstation.characterSprite.x, y: workstation.characterSprite.y } : null
        });

        // 调用后端API保存绑定信息并扣除积分
        // pointsCost 已从配置中读取，不再传递
        const saveResult = await this.saveWorkstationBinding(workstationId, {
            userId,
            userInfo,
            boundAt: workstation.boundAt,
            expiresAt: workstation.expiresAt
        });

        if (!saveResult.success) {
            console.error('保存工位绑定失败:', saveResult.error);
            // 回滚本地绑定状态
            workstation.isOccupied = false;
            workstation.userId = null;
            workstation.userInfo = null;
            this.userBindings.delete(String(workstationId));

            // 恢复视觉效果
            if (workstation.sprite) {
                workstation.sprite.clearTint();
            }
            this.removeOccupiedIcon(workstation);
            this.addInteractionIcon(workstation);

            return { success: false, error: saveResult.error };
        }

        debugLog(`工位绑定成功，服务器返回剩余积分: ${saveResult.remainingPoints}`);

        // 更新本地用户数据中的积分
        if (saveResult.remainingPoints !== undefined) {
            const userData = JSON.parse(localStorage.getItem('pixelDeskUser') || '{}');
            if (userData.id === userId) {
                userData.points = saveResult.remainingPoints;
                userData.gold = saveResult.remainingPoints;
                localStorage.setItem('pixelDeskUser', JSON.stringify(userData));
            }
        }

        // 触发事件（增强版本，包含更多信息）
        debugLog(`📢 [bindUserToWorkstation] 即将触发 user-bound 事件:`, {
            workstationId,
            userId,
            userName: userInfo?.name,
            remainingPoints: saveResult.remainingPoints,
            workstationHasCharacterAfterBinding: !!workstation.characterSprite
        });

        this.scene.events.emit('user-bound', {
            workstationId,
            userId,
            workstation,
            userInfo,
            remainingPoints: saveResult.remainingPoints,
            characterCreated: !!workstation.characterSprite
        });

        // 验证绑定状态
        const finalBindingState = {
            workstationOccupied: workstation.isOccupied,
            workstationUserId: workstation.userId,
            workstationHasCharacter: !!workstation.characterSprite,
            userBindingExists: this.userBindings.has(workstationId)
        };
        debugLog(`🔍 [bindUserToWorkstation] 结束时的绑定状态:`, finalBindingState);

        return {
            success: true,
            workstation,
            remainingPoints: saveResult.remainingPoints,
            bindingState: finalBindingState
        };
    }

    unbindUserFromWorkstation(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (!workstation) {
            debugWarn(`Workstation ${workstationId} not found`);
            return { success: false, error: 'Workstation not found' };
        }

        if (!workstation.isOccupied) {
            debugWarn(`Workstation ${workstationId} is not occupied`);
            return { success: false, error: 'Workstation not occupied' };
        }

        const userId = workstation.userId;
        const userInfo = workstation.userInfo;

        workstation.isOccupied = false;
        workstation.userId = null;
        workstation.userInfo = null;
        workstation.unboundAt = Date.now();
        this.userBindings.delete(String(workstationId));

        // 不再使用localStorage缓存，避免缓存问题

        // 恢复视觉效果
        if (workstation.sprite) {
            workstation.sprite.clearTint();
        }

        // 移除占用图标
        this.removeOccupiedIcon(workstation);

        // 重新添加交互图标
        this.addInteractionIcon(workstation);

        // 移除用户工位高亮
        this.removeUserWorkstationHighlight(workstation);

        // 移除角色显示
        this.removeCharacterFromWorkstation(workstation);

        debugLog(`Successfully unbound user ${userId} from workstation ${workstationId}`);

        // 触发事件
        this.scene.events.emit('user-unbound', {
            workstationId,
            userId,
            workstation,
            userInfo
        });

        return { success: true, userId, userInfo };
    }

    // ===== 批量操作 =====
    bindMultipleUsers(bindings) {
        const results = [];
        bindings.forEach(({ workstationId, userId, userInfo }) => {
            const result = this.bindUserToWorkstation(workstationId, userId, userInfo);
            results.push({ workstationId, userId, ...result });
        });
        return results;
    }

    unbindAllUsers() {
        const results = [];
        for (const workstationId of this.userBindings.keys()) {
            const result = this.unbindUserFromWorkstation(workstationId);
            results.push({ workstationId, ...result });
        }
        return results;
    }

    // ===== 查询方法 =====
    getWorkstation(workstationId) {
        return this.workstations.get(workstationId);
    }

    getWorkstationByUser(userId) {
        if (!userId) return null;

        for (const [wsId, boundUserId] of this.userBindings) {
            if (String(boundUserId) === String(userId)) {
                // 🔧 修复类型转换：尝试字符串和数字两种 key
                const ws = this.workstations.get(wsId) ||
                    this.workstations.get(Number(wsId)) ||
                    this.workstations.get(String(wsId));

                if (ws) return ws;
            }
        }

        // 如果上面没找到，遍历所有工位对象看看
        for (const workstation of this.workstations.values()) {
            if (String(workstation.userId) === String(userId)) {
                return workstation;
            }
        }

        return null;
    }

    getUserByWorkstation(workstationId) {
        return this.userBindings.get(workstationId);
    }

    getAllWorkstations() {
        return Array.from(this.workstations.values());
    }

    getAvailableWorkstations() {
        return Array.from(this.workstations.values()).filter(w => !w.isOccupied);
    }

    getOccupiedWorkstations() {
        return Array.from(this.workstations.values()).filter(w => w.isOccupied);
    }

    getWorkstationsByType(type) {
        return Array.from(this.workstations.values()).filter(w => w.type === type);
    }

    findWorkstationsInArea(x, y, width, height) {
        return Array.from(this.workstations.values()).filter(w => {
            return w.position.x >= x &&
                w.position.x <= x + width &&
                w.position.y >= y &&
                w.position.y <= y + height;
        });
    }

    // ===== 统计和分析 =====
    getStatistics() {
        const total = this.workstations.size;
        const occupied = this.getOccupiedWorkstations().length;
        const available = total - occupied;
        const occupancyRate = total > 0 ? (occupied / total * 100).toFixed(2) : 0;

        return {
            total,
            occupied,
            available,
            occupancyRate: `${occupancyRate}%`,
            types: this.getTypeStatistics()
        };
    }

    getTypeStatistics() {
        const types = {};
        this.workstations.forEach(workstation => {
            const type = workstation.type;
            if (!types[type]) {
                types[type] = { total: 0, occupied: 0 };
            }
            types[type].total++;
            if (workstation.isOccupied) {
                types[type].occupied++;
            }
        });
        return types;
    }

    // ===== 配置管理 =====
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // 应用新的视觉配置
        this.workstations.forEach(workstation => {
            this.restoreWorkstationTint(workstation.id);
        });
    }

    // ===== 数据导入导出 =====
    exportData() {
        return {
            workstations: Array.from(this.workstations.entries()),
            userBindings: Array.from(this.userBindings.entries()),
            config: this.config,
            exportedAt: Date.now()
        };
    }

    importData(data) {
        if (data.workstations) {
            this.workstations = new Map(data.workstations);
        }
        if (data.userBindings) {
            this.userBindings = new Map(data.userBindings);
        }
        if (data.config) {
            this.config = { ...this.config, ...data.config };
        }

        debugLog('Workstation data imported successfully');
    }

    // ===== 调试和日志 =====
    printStatistics() {
        const stats = this.getStatistics();
        debugLog('=== Workstation Statistics ===');
        debugLog(`Total workstations: ${stats.total}`);
        debugLog(`Occupied: ${stats.occupied}`);
        debugLog(`Available: ${stats.available}`);
        debugLog(`Occupancy rate: ${stats.occupancyRate}`);
        debugLog('=== Type Statistics ===');
        Object.entries(stats.types).forEach(([type, data]) => {
            debugLog(`${type}: ${data.occupied}/${data.total} occupied`);
        });
    }

    printAllWorkstations() {
        debugLog('=== All Workstations ===');
        this.workstations.forEach((workstation, id) => {
            debugLog(`ID: ${id}, User: ${workstation.userId || 'None'}, Position: (${workstation.position.x}, ${workstation.position.y}), Type: ${workstation.type}`);
        });
    }

    // ===== 后端接口预留 =====

    async loadAllWorkstationBindings() {
        // 从服务器加载所有工位绑定信息
        try {
            const response = await fetch('/api/workstations/all-bindings');
            const result = await response.json();

            if (result.success && result.data) {
                debugLog('从服务器加载工位绑定信息:', result.data);
                return result.data;
            } else {
                console.error('获取工位绑定信息失败:', result.error);
                return [];
            }
        } catch (error) {
            console.error('调用工位绑定API失败:', error);
            return [];
        }
    }

    async syncWorkstationBindings() {
        // 如果正在同步，返回现有的 Promise，避免并发重复请求
        if (this.syncPromise) {
            // debugLog('⏳ [WorkstationManager] 正在同步中，复用现有的请求');
            return this.syncPromise;
        }

        // 创建新的同步 Promise
        this.syncPromise = (async () => {
            // 完全禁用缓存系统，每次都重新获取最新数据
            debugLog('🔄 使用无缓存的工位同步方法');

            try {
                // 每次都重新获取所有绑定数据，不使用任何缓存
                const allBindings = await this.loadAllWorkstationBindings();
                debugLog(`📦 收到 ${allBindings.length} 个工位绑定:`, allBindings.map(b => ({
                    workstationId: b.workstationId,
                    userId: b.userId,
                    userName: b.user?.name
                })));

                // 直接应用绑定，完全不使用缓存
                this.applyBindingsDirectly(allBindings);

                debugLog('✅ 工位同步完成（无缓存）');
                return true;
            } catch (error) {
                console.error('❌ 工位同步失败:', error);
                throw error;
            } finally {
                this.syncPromise = null;
            }
        })();

        return this.syncPromise;
    }

    // 直接应用绑定数据，不使用缓存
    applyBindingsDirectly(bindings) {
        debugLog(`🎯 [applyBindingsDirectly] 开始直接应用 ${bindings.length} 个绑定`);

        // 创建绑定映射表
        const bindingsMap = new Map();
        bindings.forEach(binding => {
            // 同时保存字符串和数字形式的 key，确保兼容性
            bindingsMap.set(String(binding.workstationId), binding);
            bindingsMap.set(Number(binding.workstationId), binding);
        });

        // 清理所有已有的用户绑定映射并重新填充
        this.userBindings.clear();
        this.workstations.forEach((workstation, workstationId) => {
            // 🔧 修复：使用多种 key 类型尝试获取
            const binding = bindingsMap.get(workstationId) ||
                bindingsMap.get(String(workstationId)) ||
                bindingsMap.get(Number(workstationId));

            if (binding) {
                console.log(`✅ [Sync] 映射用户 ${binding.userId} -> 工位 ${workstationId}`);
                // 应用绑定状态
                workstation.isOccupied = true;
                workstation.userId = binding.userId;

                // 将绑定存入映射表以便后续查询
                this.userBindings.set(String(workstationId), String(binding.userId));
                workstation.userInfo = {
                    name: binding.users?.name || binding.user?.name,
                    avatar: binding.users?.avatar || binding.user?.avatar,
                    points: binding.users?.points || binding.user?.points,
                    // 修复：API返回的players是对象(不是数组),直接访问characterSprite
                    characterSprite: binding.users?.players?.characterSprite || binding.user?.player?.characterSprite || binding.user?.avatar,
                    // 传递用户当前状态
                    currentStatus: binding.users?.current_status || binding.user?.current_status || binding.users?.currentStatus || binding.user?.currentStatus
                };
                workstation.boundAt = binding.boundAt;

                this.userBindings.set(String(workstationId), binding.userId);

                // 更新视觉效果
                if (workstation.sprite) {
                    workstation.sprite.setTint(this.config.occupiedTint);
                }

                // 管理图标
                this.removeInteractionIcon(workstation);
                this.addOccupiedIcon(workstation);

                // 添加用户工位高亮
                this.addUserWorkstationHighlight(workstation);

                // 添加角色显示和状态图标（统一由 updateWorkstationStatusIcon 处理逻辑）
                this.updateWorkstationStatusIcon(workstation, workstation.userInfo?.currentStatus);
            } else {
                // 确保工位显示为未绑定状态
                if (workstation.isOccupied) {
                    debugLog(`❌ [applyBindingsDirectly] 清理工位 ${workstationId} 绑定状态`);

                    workstation.isOccupied = false;
                    workstation.userId = null;
                    workstation.userInfo = null;
                    this.userBindings.delete(String(workstationId));

                    // 恢复视觉效果
                    if (workstation.sprite) {
                        workstation.sprite.clearTint();
                    }

                    this.removeOccupiedIcon(workstation);
                    this.removeCharacterFromWorkstation(workstation);
                    this.removeUserWorkstationHighlight(workstation);
                    this.addInteractionIcon(workstation);
                }
            }
        });

        debugLog(`📊 [applyBindingsDirectly] 完成: ${bindings.length} 个绑定已应用`);
    }

    // 手动刷新工位状态
    async refreshWorkstationStatus() {
        debugLog('手动刷新工位状态...');
        await this.syncWorkstationBindings();

        // 触发刷新完成事件
        this.scene.events.emit('workstation-status-refreshed');

        // 如果轮询未启动，则在手动刷新后启动它
        if (!this.pollingTimer) {
            this.startStatusPolling();
        }

        return { success: true, message: '工位状态已刷新' };
    }

    // ===== 轮询同步逻辑 (定时检查 B 用户动作) =====

    /**
     * 启动状态轮询
     * @param {number} interval 轮询间隔(ms)
     */
    startStatusPolling(interval = 30000) {
        if (this.pollingTimer) this.stopStatusPolling();

        this.pollingInterval = interval;

        // 首次尝试同步
        this.syncWorkstationBindings().catch(err => debugWarn('初始同步失败:', err));

        this.pollingTimer = setInterval(() => {
            // 性能规划：
            // 1. 检查页面可见性 (Page Visibility API) - 最小化后台请求
            // 2. 检查场景有效性 - 避免在场景销毁后继续请求
            if (document.visibilityState === 'visible' && this.isSceneValid()) {
                debugLog('🕒 定时轮询：同步远程工位数据...');
                this.syncWorkstationBindings().catch(err => {
                    debugWarn('轮询同步失败:', err);
                    // 如果连续失败多次，可以考虑增加间隔（退避策略）
                });
            } else if (document.visibilityState !== 'visible') {
                // 如果用户切到其他标签页，可以暂时跳过，或者在这里降低频率
                // debugLog('💤 页面不可见，跳过此轮同步以节省资源');
            }
        }, this.pollingInterval);

        debugLog(`🚀 工位状态轮询已启动，频率: ${this.pollingInterval / 1000}s/次`);
    }

    /**
     * 停止状态轮询
     */
    stopStatusPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
            debugLog('🛑 工位状态轮询已停止');
        }
    }

    // 完全删除localStorage缓存功能，避免缓存导致的数据不一致问题
    // loadSavedBindings() {
    //     // 这个方法已被永久禁用，不再使用localStorage缓存
    // }

    // 高亮当前用户的工位
    highlightUserWorkstation(currentUserId) {
        this.workstations.forEach((workstation) => {
            if (workstation.isOccupied && workstation.userId === currentUserId) {
                // 为当前用户的工位添加特殊的金色边框
                this.addUserWorkstationHighlight(workstation);
            }
        });
    }

    addUserWorkstationHighlight(workstation) {
        // 检查是否为当前用户的工位
        const currentUser = this.scene.currentUser;
        if (!currentUser || workstation.userId !== currentUser.id) {
            return; // 只处理当前用户的工位
        }

        // 区块系统：检查sprite是否存在
        if (!workstation.sprite) {
            debugLog(`⚠️ 工位 ${workstation.id} 的sprite不存在，无法添加高亮（可能在未加载的区块中）`);
            return;
        }

        // 不再使用边框，改用工位自身的 tint 颜色来标识
        // 根据到期状态选择颜色
        const tintColor = workstation.isExpiringSoon
            ? this.config.expiringSoonTint  // 橙色警告
            : this.config.userOwnedTint;    // 金黄色

        workstation.sprite.setTint(tintColor);

        debugLog(`✨ [addUserWorkstationHighlight] 为当前用户工位 ${workstation.id} 设置 ${workstation.isExpiringSoon ? '橙色警告' : '金黄色'} tint`);

        // 如果即将过期，添加倒计时文本
        if (workstation.isExpiringSoon && workstation.remainingDays !== undefined) {
            this.addExpiryCountdown(workstation);
        }
    }

    // 添加到期倒计时文本
    addExpiryCountdown(workstation) {
        if (workstation.countdownText) {
            return; // 已有倒计时文本
        }

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            debugWarn('Scene is not available or not active, skipping addExpiryCountdown');
            return;
        }

        const countdownText = this.scene.add.text(
            workstation.position.x + workstation.size.width / 2,
            workstation.position.y - 25, // 在工位上方显示
            `${workstation.remainingDays}天`,
            {
                fontSize: '12px',
                fill: workstation.remainingDays <= 1 ? '#ff0000' : '#ff6b00', // 最后一天红色，否则橙色
                backgroundColor: '#000000',
                padding: { x: 3, y: 2 },
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        );
        countdownText.setOrigin(0.5, 0.5);
        countdownText.setScrollFactor(1);
        countdownText.setDepth(1004); // 在高亮上方

        workstation.countdownText = countdownText;

        // 如果是最后一天，添加闪烁效果
        if (workstation.remainingDays <= 1) {
            this.scene.tweens.add({
                targets: countdownText,
                alpha: 0.3,
                duration: 300,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        }
    }

    // 移除到期倒计时文本
    removeExpiryCountdown(workstation) {
        if (workstation.countdownText) {
            this.scene.tweens.killTweensOf(workstation.countdownText);
            workstation.countdownText.destroy();
            workstation.countdownText = null;
        }
    }

    removeUserWorkstationHighlight(workstation) {
        // 不再使用边框对象，只需移除倒计时文本
        this.removeExpiryCountdown(workstation);
    }

    async saveWorkstationBinding(workstationId, bindingData) {
        // 只调用后端API，完全不使用localStorage缓存
        try {
            const response = await fetch('/api/workstations/bindings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: bindingData.userId,
                    workstationId: workstationId
                    // cost 参数已从配置中读取，不再由前端传递
                })
            });

            const result = await response.json();

            if (result.success) {
                debugLog('工位绑定信息已保存到服务器:', result.data);
                return { success: true, remainingPoints: result.data.remainingPoints };
            } else {
                console.error('工位绑定失败:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('调用工位绑定API失败:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUserPoints(userId, pointsChange) {
        // 调用 User API 更新 points，真正同步到数据库
        try {
            console.log('🔵 [updateUserPoints] 开始更新用户积分:', {
                userId,
                pointsChange,
                url: '/api/users'
            });

            const response = await fetch('/api/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // 包含认证信息
                body: JSON.stringify({
                    userId: userId,
                    points: pointsChange // 使用增量更新
                })
            });

            console.log('🔵 [updateUserPoints] API响应状态:', response.status);

            const result = await response.json();
            console.log('🔵 [updateUserPoints] API响应结果:', result);

            if (result.success) {
                const newPoints = result.data.points;
                console.log(`✅ [updateUserPoints] 用户 ${userId} 积分已更新到数据库: ${pointsChange > 0 ? '+' : ''}${pointsChange}, 新积分: ${newPoints}`);

                // 触发积分更新事件，通知前端UI更新
                if (typeof window !== 'undefined') {
                    const event = new CustomEvent('user-points-updated', {
                        detail: {
                            userId: userId,
                            points: newPoints,
                            change: pointsChange
                        }
                    });
                    window.dispatchEvent(event);
                    console.log(`✅ [updateUserPoints] 已触发积分更新事件: 用户 ${userId}, 新积分: ${newPoints}`);
                }

                return { success: true, newPoints: newPoints };
            } else {
                console.error('❌ [updateUserPoints] 更新用户积分失败:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('❌ [updateUserPoints] 调用更新用户积分API失败:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== 日期管理功能 =====
    checkExpiredWorkstations() {
        const now = new Date();
        let expiredCount = 0;

        this.workstations.forEach((workstation, workstationId) => {
            if (workstation.isOccupied && workstation.expiresAt) {
                const expiresAt = new Date(workstation.expiresAt);
                if (now > expiresAt) {
                    // 工位已过期，自动解绑
                    this.unbindUserFromWorkstation(workstationId);
                    expiredCount++;
                    debugLog(`工位 ${workstationId} 已过期，自动解绑用户 ${workstation.userId}`);
                } else {
                    // 更新剩余天数
                    const remainingTime = expiresAt - now;
                    workstation.remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
                }
            }
        });

        if (expiredCount > 0) {
            debugLog(`清理了 ${expiredCount} 个过期工位`);
        }
    }

    getRemainingDays(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (!workstation || !workstation.expiresAt) {
            return 0;
        }

        const now = new Date();
        const expiresAt = new Date(workstation.expiresAt);
        const remainingTime = expiresAt - now;

        return Math.max(0, Math.ceil(remainingTime / (24 * 60 * 60 * 1000)));
    }

    // ===== 工位购买功能 =====
    async purchaseWorkstation(workstationId, userId, userInfo) {
        debugLog(`用户 ${userId} 尝试购买工位 ${workstationId}, 当前积分: ${userInfo.points || 0}`);

        // 积分检查已移至后端 API，由配置动态决定所需积分
        // 前端只需确保用户信息有效即可

        // 直接绑定工位 - 积分检查和扣除在 saveWorkstationBinding 中通过API处理
        const bindResult = await this.bindUserToWorkstation(workstationId, userId, userInfo);
        if (!bindResult.success) {
            console.error('工位绑定失败:', bindResult.error);
            return bindResult;
        }

        debugLog(`工位购买成功，剩余积分: ${bindResult.remainingPoints}`);

        return {
            success: true,
            workstation: bindResult.workstation,
            remainingPoints: bindResult.remainingPoints
        };
    }

    // ===== 角色显示管理 =====
    addCharacterToWorkstation(workstation, userId, userInfo) {
        debugLog(`👤 [addCharacterToWorkstation] 开始为工位 ${workstation.id} 添加角色:`, {
            userId,
            userInfo,
            hasExistingCharacter: !!workstation.characterSprite,
            sceneValid: this.isSceneValid(),
            workstationPosition: workstation.position,
            workstationDirection: workstation.direction,
            sceneState: {
                hasScene: !!this.scene,
                hasAdd: !!this.scene?.add,
                hasTextures: !!this.scene?.textures,
                hasLoad: !!this.scene?.load,
                sceneActive: this.scene?.scene?.isActive()
            }
        });

        if (workstation.characterSprite) {
            debugLog(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 已有角色精灵，跳过`);
            return; // 已有角色精灵
        }

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            debugWarn(`⚠️ [addCharacterToWorkstation] Scene 无效，跳过工位 ${workstation.id} 的角色添加`);
            return;
        }

        // 检查当前用户信息 - 不在当前用户的工位旁边显示角色（避免重复显示）
        const currentUser = this.scene.currentUser;
        debugLog(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 检查用户:`, {
            currentUserId: currentUser?.id,
            workstationUserId: workstation.userId,
            isCurrentUser: currentUser && workstation.userId === currentUser.id
        });

        // 🟢 新增：检查用户状态是否为"下班"
        // 优先检查：如果是下班状态，不显示角色，而是显示"Closed"标识
        // 这必须在检查"当前用户"之前执行，确保用户自己登录后也能看到自己的打烊牌子
        if (userInfo && userInfo.currentStatus && userInfo.currentStatus.type === 'off_work') {
            debugLog(`👤 [addCharacterToWorkstation] 用户 ${userId} 处于下班状态，不显示角色，显示 Closed 标识`);
            this.addClosedSign(workstation);
            return;
        }

        // 如果是当前用户的工位，不显示角色（因为玩家自己已经在屏幕上显示了）
        if (currentUser && workstation.userId === currentUser.id) {
            debugLog(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 是当前用户 ${currentUser.id} 的工位，不显示角色（避免视觉重复）`);
            return;
        }

        // 根据工位方向计算角色位置
        const { x: charX, y: charY, direction: characterDirection } = this.calculateCharacterPosition(workstation);
        debugLog(`📐 [addCharacterToWorkstation] 计算角色位置:`, {
            charX, charY, characterDirection,
            workstationPos: workstation.position,
            workstationSize: workstation.size,
            workstationDirection: workstation.direction
        });

        // 确定角色图片 - 优先使用player表的characterSprite
        let characterKey = 'Premade_Character_48x48_01'; // 默认角色
        if (userInfo) {
            // 优先使用player表的characterSprite，其次是character字段，最后是avatar（如果是角色精灵格式）
            // 优先使用player表的characterSprite，其次是character字段，最后是avatar（如果是角色精灵格式）
            if (userInfo.characterSprite) {
                characterKey = userInfo.characterSprite;
            } else if (userInfo.character) {
                characterKey = userInfo.character;
            } else if (userInfo.avatar && (userInfo.avatar.includes('Character') || userInfo.avatar.includes('hangli'))) {
                characterKey = userInfo.avatar;
            }
        }
        debugLog(`🎨 [addCharacterToWorkstation] 角色图片选择:`, {
            characterKey,
            userInfoCharacterSprite: userInfo?.characterSprite,
            userInfoCharacter: userInfo?.character,
            userInfoAvatar: userInfo?.avatar,
            finalKey: characterKey
        });

        // 尝试加载角色图片
        try {
            debugLog(`🔍 [addCharacterToWorkstation] 检查场景纹理管理器:`, {
                hasScene: !!this.scene,
                hasTextures: !!this.scene?.textures,
                hasLoad: !!this.scene?.load,
                texturesExists: this.scene?.textures?.exists(characterKey)
            });

            // 检查 scene 是否有纹理管理器
            if (!this.scene || !this.scene.textures || !this.scene.load) {
                debugWarn('⚠️ [addCharacterToWorkstation] Scene textures or loader not available, using default character');
                this.createCharacterSprite(workstation, charX, charY, 'Premade_Character_48x48_01', userId, characterDirection);
                return;
            }

            // 如果图片还没加载，使用按需加载逻辑
            if (!this.scene.textures.exists(characterKey)) {
                debugLog(`📥 [addCharacterToWorkstation] 开始按需加载角色纹理: ${characterKey}`);

                // 优先使用 Start.js 提供的按需加载方法
                if (typeof this.scene.ensureCharacterTexture === 'function') {
                    this.scene.ensureCharacterTexture(characterKey).then(success => {
                        if (success && this.isSceneValid()) {
                            this.createCharacterSprite(workstation, charX, charY, characterKey, userId, characterDirection);
                        } else if (this.isSceneValid()) {
                            debugWarn(`⚠️ [addCharacterToWorkstation] 按需加载失败，使用默认角色: ${characterKey}`);
                            this.createCharacterSprite(workstation, charX, charY, 'Premade_Character_48x48_01', userId, characterDirection);
                        }
                    });
                } else {
                    // 回退方案：传统加载
                    this.scene.load.spritesheet(characterKey, `/assets/characters/${characterKey}.png`, {
                        frameWidth: 48, frameHeight: 48
                    });
                    this.scene.load.once(`filecomplete-spritesheet-${characterKey}`, () => {
                        if (this.isSceneValid()) this.createCharacterSprite(workstation, charX, charY, characterKey, userId, characterDirection);
                    });
                    this.scene.load.start();
                }
            } else {
                debugLog(`✅ [addCharacterToWorkstation] 纹理已存在: ${characterKey}`);
                this.createCharacterSprite(workstation, charX, charY, characterKey, userId, characterDirection);
            }
        } catch (error) {
            console.error('❌ [addCharacterToWorkstation] 无法加载角色图片:', characterKey, error);
            // 使用默认角色
            if (characterKey !== 'Premade_Character_48x48_01') {
                debugLog(`🔄 [addCharacterToWorkstation] 回退到默认角色`);
                this.createCharacterSprite(workstation, charX, charY, 'Premade_Character_48x48_01', userId, characterDirection);
            } else {
                console.error(`❌ [addCharacterToWorkstation] 连默认角色都无法创建`);
            }
        }
    }

    createCharacterSprite(workstation, x, y, characterKey, userId, characterDirection) {
        debugLog(`🎨 [createCharacterSprite] 开始创建工位 ${workstation.id} 的角色精灵:`, {
            position: { x, y },
            characterKey,
            userId,
            characterDirection,
            sceneValid: this.isSceneValid()
        });

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            debugWarn(`⚠️ [createCharacterSprite] Scene 无效，跳过工位 ${workstation.id} 的角色精灵创建`);
            return;
        }

        // 创建真正的Player实例（其他玩家）
        const currentStatus = workstation.userInfo?.currentStatus || {
            type: 'working',
            status: '工作中',
            emoji: '💼',
            message: '正在工作中...',
            timestamp: new Date().toISOString()
        };

        // 创建主玩家的playerData
        const playerData = {
            id: userId,
            name: workstation.userInfo?.name || workstation.userInfo?.username || `玩家${userId.slice(-4)}`,
            isWorkstationPlayer: true,
            currentStatus: currentStatus
        };

        debugLog(`👤 [createCharacterSprite] 创建Player实例，数据:`, playerData);

        try {
            debugLog(`🚀 [createCharacterSprite] 开始创建 Player 实例:`, {
                scene: !!this.scene,
                position: { x, y },
                characterKey,
                playerData,
                PlayerClass: typeof Player
            });

            // 创建Player实例（禁用移动和状态保存，标记为其他玩家）
            const character = new Player(this.scene, x, y, characterKey, false, false, true, playerData);
            debugLog(`✅ [createCharacterSprite] Player实例创建成功:`, {
                character: !!character,
                characterId: character?.playerData?.id,
                characterName: character?.playerData?.name,
                characterPosition: { x: character?.x, y: character?.y },
                characterTexture: character?.texture?.key,
                characterVisible: character?.visible,
                characterActive: character?.active
            });

            // 设置角色朝向
            if (typeof character.setDirectionFrame === 'function') {
                character.setDirectionFrame(characterDirection);
                debugLog(`🧭 [createCharacterSprite] 角色朝向设置完成: ${characterDirection}`);

                // 验证设置是否生效
                debugLog(`🔍 [createCharacterSprite] 验证帧设置:`, {
                    targetDirection: characterDirection,
                    currentDirection: character.currentDirection,
                    headFrame: character.headSprite?.frame?.name,
                    bodyFrame: character.bodySprite?.frame?.name,
                    headTexture: character.headSprite?.texture?.key,
                    bodyTexture: character.bodySprite?.texture?.key
                });
            } else {
                debugWarn(`⚠️ [createCharacterSprite] character.setDirectionFrame 不是一个函数`);
            }

            // 设置缩放（稍微缩小一点）
            character.setScale(0.8);
            debugLog(`🔍 [createCharacterSprite] 角色缩放设置完成: 0.8`);

            // 设置深度
            character.setDepth(1000); // 在工位上方
            debugLog(`🔍 [createCharacterSprite] 角色深度设置完成: 1000`);

            // 设置可交互
            character.setInteractive(new Phaser.Geom.Rectangle(-20, -30, 40, 60), Phaser.Geom.Rectangle.Contains);
            character.on('pointerdown', () => {
                this.onCharacterClick(userId, workstation);
            });

            // 添加到场景
            this.scene.add.existing(character);

            // 加入物理组（关键：用于碰撞检测）
            if (this.scene.otherPlayersGroup) {
                this.scene.otherPlayersGroup.add(character);
                // 确保碰撞器已创建
                if (typeof this.scene.ensurePlayerCharacterOverlap === 'function') {
                    this.scene.ensurePlayerCharacterOverlap();
                }
            }

            // 保存引用
            workstation.characterSprite = character;
            workstation.characterKey = characterKey;
            workstation.characterDirection = characterDirection;

            debugLog(`✅ [createCharacterSprite] 工位 ${workstation.id} 角色创建完成`);

        } catch (error) {
            console.error(`❌ [createCharacterSprite] 工位 ${workstation.id} 角色创建失败:`, error);
        }
    }

    onCharacterClick(userId, workstation) {
        debugLog(`点击了工位 ${workstation.id} 上的角色 ${userId}`);

        // 检查userInfo是否为null或undefined
        const userInfo = workstation.userInfo || {};

        // 触发角色点击事件
        this.scene.events.emit('character-clicked', {
            userId,
            workstationId: workstation.id,
            userInfo: userInfo,
            position: { x: workstation.position.x, y: workstation.position.y }
        });

        // 如果有全局函数，调用它
        if (typeof window !== 'undefined' && window.showCharacterInfo) {
            window.showCharacterInfo(userId, userInfo, {
                x: workstation.position.x,
                y: workstation.position.y
            });
        }
    }

    removeCharacterFromWorkstation(workstation) {
        if (workstation.characterSprite) {
            workstation.characterSprite.destroy();
            workstation.characterSprite = null;
            workstation.characterKey = null;
            workstation.characterDirection = null;
        }
    }

    // 根据工位方向计算角色位置
    calculateCharacterPosition(workstation) {
        const position = workstation.position;
        const size = workstation.size;
        const direction = workstation.direction;
        const offsetX = 24;
        const offsetY = 48;

        let characterX = position.x;
        let characterY = position.y;
        let characterDirection = 'down';
        console.log('calculateCharacterPosition', workstation, direction)
        switch (direction) {
            case 'left':
                // 左侧朝向的桌子 -> 角色站在左边，面向右边
                characterX = position.x - offsetX;
                characterY = position.y - offsetY;
                characterDirection = 'right';
                break;

            case 'right':
                // 右侧朝向的桌子 -> 角色站在右边，面向左边
                characterX = position.x + size.width + offsetX;
                characterY = position.y - offsetY;
                characterDirection = 'left';
                break;

            case 'up':
                // 桌子在后，椅子在前 -> 角色站在桌子下方，面向桌子 (up)
                characterX = position.x + (size.width / 2);
                characterY = position.y + size.height - 45; // 向上偏移，使其坐入椅子中
                characterDirection = 'up';
                break;

            case 'single':
                // 单人桌，角色放在工位上方，面向下
                characterX = position.x + (size.width / 2); // 居中
                characterY = position.y - offsetY - 30;
                characterDirection = 'down';
                break;

            case 'center':
                // 中间工位，角色放在工位上方，面向下
                characterX = position.x + (size.width / 2) - 24; // 居中
                characterY = position.y - offsetY;
                characterDirection = 'down';
                break;

            default:
                // 默认处理
                characterX = position.x + size.width + offsetX;
                characterY = position.y;
                characterDirection = 'left';
        }

        // 额外调整：向上移动48像素，根据朝向左右调整30像素
        characterY -= 48; // 向上移动48像素

        switch (characterDirection) {
            case 'left':
                characterX -= 30; // 向左调整30像素
                break;
            case 'right':
                characterX += 30; // 向右调整30像素
                break;
            // down方向不需要左右调整
        }

        return { x: characterX, y: characterY, direction: characterDirection };
    }

    // ===== 交互图标管理 =====
    addInteractionIcon(workstation) {
        // 用户要求去掉这个图标，直接返回
        return;

        if (workstation.interactionIcon) {
            return; // 已有交互图标
        }

        // 区块系统：检查sprite和场景是否有效
        if (!workstation.sprite) {
            // 工位未加载，跳过
            return;
        }

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            debugWarn('Scene is not available or not active, skipping addInteractionIcon');
            return;
        }

        const iconX = workstation.position.x + workstation.size.width / 2;
        const iconY = workstation.position.y + workstation.size.height / 2;

        // 创建交互图标
        const icon = this.scene.add.text(
            iconX,
            iconY,
            '🔗',
            {
                fontSize: '20px',
                fill: '#ffffff',
                backgroundColor: '#007bff',
                padding: { x: 4, y: 2 }
            }
        );
        icon.setOrigin(0.5, 0.5);
        icon.setScrollFactor(1); // 跟随地图滚动
        icon.setDepth(1001); // 确保在最上层
        icon.setInteractive();

        // 添加点击事件
        icon.on('pointerdown', () => this.onWorkstationClick(workstation.id));
        icon.on('pointerover', () => {
            icon.setScale(1.2);
            if (this.scene && this.scene.input) {
                this.scene.input.setDefaultCursor('pointer');
            }
        });
        icon.on('pointerout', () => {
            icon.setScale(1);
            if (this.scene && this.scene.input) {
                this.scene.input.setDefaultCursor('default');
            }
        });

        workstation.interactionIcon = icon;
    }

    addOccupiedIcon(workstation) {
        // 不再使用👤图标标记用户工位，改用颜色高亮（在 addUserWorkstationHighlight 中实现）
        // 此方法保留但不执行任何操作，避免破坏现有调用逻辑
        debugLog(`🏷️ [addOccupiedIcon] 工位 ${workstation.id} 不再使用图标标记，改用颜色高亮`);
    }

    removeInteractionIcon(workstation) {
        if (workstation.interactionIcon) {
            workstation.interactionIcon.destroy();
            workstation.interactionIcon = null;
        }
    }

    removeOccupiedIcon(workstation) {
        if (workstation.occupiedIcon) {
            workstation.occupiedIcon.destroy();
            workstation.occupiedIcon = null;
        }
        // 同时清理状态图标
        this.removeStatusIcon(workstation);
    }

    // 🏷️ 新增：为工位添加/更新旋转的状态图标
    updateWorkstationStatusIcon(workstation, statusData) {
        if (!workstation || !workstation.sprite || !this.isSceneValid()) return;

        console.log(`🏷️ [WorkstationManager] 更新工位 ${workstation.id} 的状态图标:`, statusData?.type);

        // 如果已经有状态图标，先移除
        this.removeStatusIcon(workstation);

        // 🟢 修改：处理"下班" (off_work) 状态
        if (statusData && statusData.type === 'off_work') {
            console.log(`🏠 [WorkstationManager] 工位 ${workstation.id} 设置为下班状态`);
            // 移除角色（如果存在）
            this.removeCharacterFromWorkstation(workstation);
            // 显示下班标识
            this.addClosedSign(workstation);
            // 移除普通状态图标
            this.removeStatusIcon(workstation);
            return;
        } else {
            // 如果不是下班状态，移除下班标识
            this.removeClosedSign(workstation);
            console.log(`💼 [WorkstationManager] 工位 ${workstation.id} 设置为活跃状态:`, statusData?.type || 'working');

            // 确保角色显示（如果应该显示但没显示）
            if (workstation.userId) {
                // 注意：这里需要userInfo，我们假设workstation上的userInfo是最新的或者statusData包含足够信息
                const userInfo = workstation.userInfo || {};
                // 合并此状态更新
                userInfo.currentStatus = statusData;
                workstation.userInfo = userInfo; // 确保写回

                if (!workstation.characterSprite) {
                    console.log(`👤 [WorkstationManager] 工位 ${workstation.id} 尝试恢复角色显示`);
                    this.addCharacterToWorkstation(workstation, workstation.userId, userInfo);
                }
            }
        }

        // 如果没有状态数据，则不创建图标
        if (!statusData) return;

        const emoji = statusData.emoji || '💼';

        // 计算图标位置（桌面正上方）
        const iconX = workstation.position.x + workstation.size.width / 2;
        const iconY = workstation.position.y - 35; // 稍高一点

        // 创建状态容器
        const container = this.scene.add.container(iconX, iconY);
        container.setDepth(2000);

        // 1. 创建阴影（增加深度）
        const shadow = this.scene.add.ellipse(0, 30, 20, 8, 0x000000, 0.3);

        // 2. 创建发光光环 (Glow Aura)
        const aura = this.scene.add.graphics();
        aura.lineStyle(2, 0x00FFFF, 0.6);
        aura.strokeCircle(0, 0, 22);

        // 为光环增加点缀
        for (let i = 0; i < 4; i++) {
            const dot = this.scene.add.circle(Math.cos(i * Math.PI / 2) * 22, Math.sin(i * Math.PI / 2) * 22, 2, 0x00FFFF, 0.8);
            container.add(dot);
            // 点缀旋转动画
            this.scene.tweens.add({
                targets: dot,
                alpha: 0.2,
                duration: 800,
                yoyo: true,
                repeat: -1,
                delay: i * 200
            });
        }

        // 3. 创建磨砂玻璃底座
        const base = this.scene.add.circle(0, 0, 18, 0xffffff, 0.15);
        base.setStrokeStyle(1.5, 0xffffff, 0.3);

        // 4. Emoji 文本
        const text = this.scene.add.text(0, 0, emoji, {
            fontSize: '26px',
            fontFamily: 'Arial'
        });
        text.setOrigin(0.5, 0.5);

        container.add([shadow, aura, base, text]);
        workstation.statusIcon = container;

        // --- 豪华动画组合 ---

        // A. 悬浮动画 (Floating)
        this.scene.tweens.add({
            targets: container,
            y: iconY - 12,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // B. 阴影同步缩放
        this.scene.tweens.add({
            targets: shadow,
            scaleX: 0.7,
            scaleY: 0.7,
            alpha: 0.1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // C. 光环持续旋转 (Rotation)
        this.scene.tweens.add({
            targets: aura,
            angle: 360,
            duration: 5000,
            repeat: -1
        });

        // D. 整体轻微晃动
        this.scene.tweens.add({
            targets: container,
            angle: 8,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // E. 底座脉冲发光
        this.scene.tweens.add({
            targets: base,
            scale: 1.1,
            alpha: 0.25,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Cubic.easeInOut'
        });
    }

    removeStatusIcon(workstation) {
        if (workstation.statusIcon) {
            workstation.statusIcon.destroy();
            workstation.statusIcon = null;
        }
    }

    // ===== Closed 标识管理 =====
    addClosedSign(workstation) {
        if (workstation.closedSign) return; // 已有标识

        if (!this.isSceneValid()) return;

        // 计算显示位置（桌面正中心上方）
        const iconX = workstation.position.x + workstation.size.width / 2;
        const iconY = workstation.position.y - 45; // 提高一点，避免遮挡

        // 创建容器
        const container = this.scene.add.container(iconX, iconY);
        container.setDepth(2000); // 确保在最上层

        // 1. 绘制挂绳 (Graphics)
        const ropes = this.scene.add.graphics();
        ropes.lineStyle(2, 0x8B4513, 1); // 深褐色绳子
        // 左绳
        ropes.beginPath();
        ropes.moveTo(-15, 0);
        ropes.lineTo(0, -15);
        ropes.strokePath();
        // 右绳
        ropes.beginPath();
        ropes.moveTo(15, 0);
        ropes.lineTo(0, -15);
        ropes.strokePath();

        // 挂点（钉子）
        const nail = this.scene.add.circle(0, -15, 3, 0x555555);

        // 2. 绘制木牌背景 (Graphics)
        const board = this.scene.add.graphics();

        // 木板主体 (深色木纹)
        board.fillStyle(0x8B4513, 1); // SaddleBrown
        board.fillRoundedRect(-25, 0, 50, 30, 4);

        // 木板边框 (更深色)
        board.lineStyle(2, 0x5D4037, 1);
        board.strokeRoundedRect(-25, 0, 50, 30, 4);

        // 木板纹理 (简单的线条)
        board.lineStyle(1, 0xA0522D, 0.5); // Sienna
        board.beginPath();
        board.moveTo(-20, 10);
        board.lineTo(20, 10);
        board.moveTo(-15, 20);
        board.lineTo(25, 20);
        board.strokePath();

        // 3. 绘制文字
        const text = this.scene.add.text(0, 15, '打烊', {
            fontSize: '16px',
            fontFamily: '"Press Start 2P", monospace', // 尝试使用像素字体
            fill: '#FFF8DC', // Cornsilk
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        });
        text.setOrigin(0.5, 0.5);

        // 将所有元素添加到容器
        container.add([ropes, nail, board, text]);

        workstation.closedSign = container;

        // 4. 添加悬浮动画
        this.scene.tweens.add({
            targets: container,
            y: iconY - 5,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 5. 添加轻微摇晃动画 (像是风吹过)
        this.scene.tweens.add({
            targets: container,
            angle: 2,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000 // 随机延迟，让多个牌子不同步
        });
    }

    removeClosedSign(workstation) {
        if (workstation.closedSign) {
            this.scene.tweens.killTweensOf(workstation.closedSign);
            workstation.closedSign.destroy();
            workstation.closedSign = null;
        }
    }

    // ===== 快速回到工位功能 =====
    async teleportToWorkstation(userId, player) {
        // 直接从API查询用户的工位绑定，不依赖内存缓存
        let workstation;
        try {
            const response = await fetch(`/api/workstations/user-bindings?userId=${userId}`);
            const result = await response.json();

            if (!result.success || result.data.length === 0) {
                debugWarn(`用户 ${userId} 没有绑定的工位`);
                return { success: false, error: '您还没有绑定工位' };
            }

            const binding = result.data[0];
            workstation = this.workstations.get(parseInt(binding.workstationId));

            if (!workstation) {
                debugWarn(`找不到工位 ${binding.workstationId}`);
                return { success: false, error: '工位不存在' };
            }
        } catch (error) {
            console.error('查询工位绑定失败:', error);
            return { success: false, error: '查询工位失败' };
        }

        debugLog(`找到用户 ${userId} 的绑定工位: ID ${workstation.id}, 位置 (${workstation.position.x}, ${workstation.position.y})`);
        if (workstation.sprite) {
            debugLog(`工位精灵实际位置: (${workstation.sprite.x}, ${workstation.sprite.y})`);
        }

        // 计算传送位置（工位前方）
        const teleportPosition = this.calculateTeleportPosition(workstation);

        // 从全局配置获取传送所需积分（优先使用预加载的配置，避免API调用）
        let teleportCost = 3; // 默认值
        try {
            // 优先从全局预加载的配置中获取
            if (typeof window !== 'undefined' && window.pointsConfig) {
                teleportCost = window.pointsConfig.teleport_workstation_cost || 3;
                console.log('🟢 [teleportToWorkstation] 从缓存获取传送费用:', teleportCost);
            } else {
                // 如果没有预加载，才调用 API
                console.log('🟢 [teleportToWorkstation] 获取传送积分配置...');
                const configResponse = await fetch('/api/points-config?key=teleport_workstation_cost');
                if (configResponse.ok) {
                    const configData = await configResponse.json();
                    if (configData.success && configData.data) {
                        teleportCost = configData.data.value;
                        console.log('🟢 [teleportToWorkstation] 传送费用:', teleportCost);
                    }
                }
            }
        } catch (error) {
            console.error('❌ [teleportToWorkstation] 获取传送积分配置失败，使用默认值:', error);
        }

        // 扣除积分（调用User API，真正更新数据库）
        console.log('🟢 [teleportToWorkstation] 开始扣除积分:', { userId, teleportCost: -teleportCost });
        const pointsResult = await this.updateUserPoints(userId, -teleportCost);
        console.log('🟢 [teleportToWorkstation] 积分扣除结果:', pointsResult);

        if (!pointsResult.success) {
            console.error('❌ [teleportToWorkstation] 扣除积分失败:', pointsResult.error);
            return { success: false, error: '积分扣除失败: ' + (pointsResult.error || '未知错误') };
        }

        // 执行传送
        if (player && typeof player.teleportTo === 'function') {
            console.log(`🟢 [teleportToWorkstation] 执行传送: (${player.x}, ${player.y}) -> (${teleportPosition.x}, ${teleportPosition.y})`);
            player.teleportTo(teleportPosition.x, teleportPosition.y, teleportPosition.direction);
        }

        console.log(`✅ [teleportToWorkstation] 用户 ${userId} 快速回到工位，扣除${teleportCost}积分，剩余积分: ${pointsResult.newPoints}`);

        // 触发事件
        this.scene.events.emit('teleport-to-workstation', {
            userId,
            workstationId: workstation.id,
            position: teleportPosition,
            pointsDeducted: teleportCost,
            remainingPoints: pointsResult.newPoints
        });

        return {
            success: true,
            workstation,
            position: teleportPosition,
            pointsDeducted: teleportCost,
            remainingPoints: pointsResult.newPoints
        };
    }

    // 计算传送位置（工位前方）
    calculateTeleportPosition(workstation) {
        // 使用工位精灵的实际位置，而不是Tiled对象的位置
        const spriteX = workstation.sprite ? workstation.sprite.x : workstation.position.x;
        const spriteY = workstation.sprite ? workstation.sprite.y : workstation.position.y;
        const { size, direction } = workstation;
        const offset = 60; // 距离工位的偏移量

        let teleportX = spriteX + size.width / 2;
        let teleportY = spriteY + size.height / 2;
        let teleportDirection = 'down';

        switch (direction) {
            case 'right':
                teleportX = spriteX + size.width + offset;
                teleportY = spriteY + size.height / 2;
                teleportDirection = 'left';
                break;
            case 'left':
                teleportX = spriteX - offset;
                teleportY = spriteY + size.height / 2;
                teleportDirection = 'right';
                break;
            case 'single':
            case 'center':
            default:
                teleportX = spriteX + size.width / 2;
                teleportY = spriteY - offset;
                teleportDirection = 'down';
                break;
        }

        debugLog(`计算传送位置: 工位ID ${workstation.id}, 精灵位置 (${spriteX}, ${spriteY}), 传送位置 (${teleportX}, ${teleportY})`);
        return { x: teleportX, y: teleportY, direction: teleportDirection };
    }

    // ===== 清理方法 =====
    clearAllBindings() {
        // 清理所有工位绑定（仅在必要时使用，避免界面闪烁）
        debugLog('强制清理所有工位绑定...');
        const results = this.unbindAllUsers();
        debugLog(`已清理 ${results.length} 个工位绑定`);

        // 移除所有交互图标、占用图标和角色显示
        this.workstations.forEach(workstation => {
            this.removeInteractionIcon(workstation);
            this.removeOccupiedIcon(workstation);
            this.removeCharacterFromWorkstation(workstation);
        });

        debugLog('所有工位绑定和交互图标已清理');
    }

    // 新增：优雅清理方法，用于场景切换等情况
    gracefulClearBindings() {
        // 优雅地清理绑定，避免视觉闪烁
        debugLog('优雅清理工位绑定...');

        // 逐个清理，给每个清理操作一些延迟
        const workstationIds = Array.from(this.userBindings.keys());
        let clearCount = 0;

        workstationIds.forEach((workstationId, index) => {
            setTimeout(() => {
                this.unbindUserFromWorkstation(workstationId);
                clearCount++;

                if (clearCount === workstationIds.length) {
                    debugLog(`优雅清理完成，共清理 ${clearCount} 个工位绑定`);
                }
            }, index * 50); // 每个清理操作间隔50ms
        });
    }

    // 强制重新同步所有工位绑定的方法
    async forceRefreshAllBindings() {
        debugLog('🔄 强制重新同步所有工位绑定...');

        try {
            // 1. 清理当前所有绑定状态（不调用API，只清理本地状态）
            this.workstations.forEach((workstation, workstationId) => {
                if (workstation.isOccupied) {
                    // 恢复为未绑定状态
                    workstation.isOccupied = false;
                    workstation.userId = null;
                    workstation.userInfo = null;
                    this.userBindings.delete(String(workstationId));

                    // 清理视觉效果
                    if (workstation.sprite) {
                        workstation.sprite.clearTint();
                    }
                    this.removeOccupiedIcon(workstation);
                    this.removeCharacterFromWorkstation(workstation);
                    this.removeUserWorkstationHighlight(workstation);
                    this.addInteractionIcon(workstation);
                }
            });

            // 2. 重新获取所有绑定数据
            const allBindings = await this.loadAllWorkstationBindings();
            debugLog(`📦 获取到 ${allBindings.length} 个工位绑定数据:`, allBindings.map(b => ({
                workstationId: b.workstationId,
                userId: b.userId,
                userName: b.user?.name
            })));

            // 3. 应用所有绑定
            let appliedCount = 0;
            allBindings.forEach(binding => {
                const workstation = this.workstations.get(parseInt(binding.workstationId));
                if (workstation) {
                    debugLog(`✅ 应用工位 ${binding.workstationId} 绑定: ${binding.user?.name}`);
                    this.applyBindingToWorkstation(workstation, binding);
                    appliedCount++;
                } else {
                    debugWarn(`⚠️ 工位 ${binding.workstationId} 在地图中不存在`);
                }
            });

            debugLog(`✅ 强制同步完成: ${appliedCount}/${allBindings.length} 个绑定已应用`);
            return { success: true, applied: appliedCount, total: allBindings.length };

        } catch (error) {
            console.error('❌ 强制同步失败:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== 视口优化系统已永久禁用 =====

    /**
     * 视口优化功能已永久禁用，避免缓存问题
     */
    enableViewportOptimization() {
        debugLog('🚫 视口优化已永久禁用，避免缓存问题');
        return;
    }

    /**
     * 视口优化功能已永久禁用
     */
    disableViewportOptimization() {
        debugLog('🚫 视口优化已永久禁用');
        return;
    }

    // 所有视口优化相关方法已永久禁用
    setupViewportListeners() { /* 已禁用 */ }
    onViewportChange() { /* 已禁用 */ }

    // 所有视口优化相关方法已永久禁用，避免缓存问题
    async updateVisibleWorkstations() { /* 已禁用 */ }
    getCurrentViewport() { return { x: 0, y: 0, width: 800, height: 600, zoom: 1 }; }
    shouldUpdateViewport() { return false; }
    getWorkstationsInViewport() { return []; }

    // 视口优化同步方法已永久禁用
    async syncVisibleWorkstationBindings() {
        debugLog('🚫 视口优化同步已永久禁用，使用标准同步');
        return await this.syncWorkstationBindings();
    }

    // 这个方法已不再需要，因为我们直接使用loadAllWorkstationBindings
    async loadWorkstationBindingsByIds() {
        debugLog('🚫 loadWorkstationBindingsByIds已禁用，使用loadAllWorkstationBindings');
        return await this.loadAllWorkstationBindings();
    }

    // 视口绑定应用方法已禁用
    applyVisibleBindings() {
        debugLog('🚫 applyVisibleBindings已禁用');
    }

    /**
     * 应用绑定状态到工位
     */
    applyBindingToWorkstation(workstation, binding) {
        debugLog(`🎯 [applyBindingToWorkstation] 开始应用工位 ${workstation.id} 的绑定:`, {
            userId: binding.userId,
            userName: binding.users?.name || binding.user?.name,
            remainingDays: binding.remainingDays,
            isExpiringSoon: binding.isExpiringSoon,
            workstationSprite: !!workstation.sprite,
            currentlyOccupied: workstation.isOccupied,
            hasCharacterSprite: !!workstation.characterSprite,
            // 调试：显示API返回的数据结构
            apiDataStructure: {
                hasUsers: !!binding.users,
                hasUser: !!binding.user,
                usersPlayers: binding.users?.players,
                characterSpriteFromAPI: binding.users?.players?.characterSprite
            }
        });

        // 应用绑定状态（不调用完整的绑定方法，避免API调用）
        workstation.isOccupied = true;
        workstation.userId = binding.userId;
        workstation.userInfo = {
            name: binding.users?.name || binding.user?.name,
            avatar: binding.users?.avatar || binding.user?.avatar,
            points: binding.users?.points || binding.user?.points,
            // 修复：API返回的players是对象(不是数组),直接访问characterSprite
            characterSprite: binding.users?.players?.characterSprite || binding.user?.player?.characterSprite || binding.user?.avatar
        };
        workstation.boundAt = binding.boundAt;
        workstation.expiresAt = binding.expiresAt;
        workstation.remainingDays = binding.remainingDays || 30;
        workstation.isExpiringSoon = binding.isExpiringSoon || false;

        this.userBindings.set(String(workstation.id), binding.userId);
        debugLog(`✅ [applyBindingToWorkstation] 工位 ${workstation.id} 状态已更新: isOccupied=${workstation.isOccupied}, userId=${workstation.userId}, remainingDays=${workstation.remainingDays}`);

        // 区块系统：只有当sprite存在时才更新视觉效果
        if (workstation.sprite) {
            workstation.sprite.setTint(this.config.occupiedTint);
            debugLog(`🎨 [applyBindingToWorkstation] 工位 ${workstation.id} 精灵已着色`);

            // 管理图标
            this.removeInteractionIcon(workstation);
            this.addOccupiedIcon(workstation);
            debugLog(`🏷️ [applyBindingToWorkstation] 工位 ${workstation.id} 图标已更新`);

            // 添加用户工位高亮（如果即将过期，使用警告颜色）
            this.addUserWorkstationHighlight(workstation);

            // 添加角色显示
            debugLog(`👤 [applyBindingToWorkstation] 开始为工位 ${workstation.id} 添加角色显示`);
            this.addCharacterToWorkstation(workstation, binding.userId, workstation.userInfo);
        } else {
            debugLog(`⚠️ [applyBindingToWorkstation] 工位 ${workstation.id} 的sprite不存在，跳过视觉效果更新（可能在未加载的区块中）`);
        }

        debugLog(`🎯 [applyBindingToWorkstation] 工位 ${workstation.id} 绑定应用完成`, {
            hasCharacterAfter: !!workstation.characterSprite,
            characterKey: workstation.characterKey,
            remainingDays: workstation.remainingDays,
            isExpiringSoon: workstation.isExpiringSoon
        });
    }

    /**
     * 确保工位显示为未绑定状态
     */
    ensureWorkstationUnbound(workstation) {
        if (!workstation.isOccupied) return; // 已经是未绑定状态

        workstation.isOccupied = false;
        workstation.userId = null;
        workstation.userInfo = null;
        this.userBindings.delete(String(workstation.id));

        // 恢复视觉效果
        if (workstation.sprite) {
            workstation.sprite.clearTint();
        }

        this.removeOccupiedIcon(workstation);
        this.removeCharacterFromWorkstation(workstation);
        this.addInteractionIcon(workstation);
    }

    // 所有视口优化相关方法已永久禁用
    cleanupInvisibleBindings() { /* 已禁用 */ }
    getViewportStats() { return { enabled: false, message: '视口优化已永久禁用' }; }
    invalidateWorkstationBinding() { /* 已禁用 */ }

    destroy() {
        // 停止轮询
        this.stopStatusPolling();
        // 清理视口优化相关资源
        this.disableViewportOptimization();
        // 清理所有事件监听器和交互图标
        this.workstations.forEach(workstation => {
            if (workstation.sprite) {
                workstation.sprite.removeAllListeners();
            }
            this.removeInteractionIcon(workstation);
            this.removeOccupiedIcon(workstation);
            this.removeCharacterFromWorkstation(workstation);
        });

        this.workstations.clear();
        this.userBindings.clear();
        debugLog('WorkstationManager destroyed');
    }

    // 清理userBindings中的无效数据
    cleanupUserBindings() {
        debugLog(`🧹 [cleanupUserBindings] 清理初始化时的userBindings，当前条目数: ${this.userBindings.size}`);
        this.userBindings.clear();
        debugLog(`✅ [cleanupUserBindings] userBindings已清空，避免遗留数据问题`);
    }
}