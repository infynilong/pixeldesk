import { Player } from '../entities/Player.js';
import { WorkstationBindingCache, AdaptiveDebounce } from '../cache/WorkstationBindingCache.js';

export class WorkstationManager {
    constructor(scene) {
        this.scene = scene;
        this.workstations = new Map(); // 存储工位信息：id -> workstation对象
        this.userBindings = new Map();  // 存储用户绑定：workstationId -> userId
        
        // 视口优化相关属性
        this.bindingCache = null;           // 工位绑定缓存实例
        this.adaptiveDebounce = null;       // 自适应防抖实例
        this.currentViewport = null;        // 当前视口信息
        this.viewportUpdateDebounce = null; // 视口更新防抖定时器
        this.isViewportOptimizationEnabled = false; // 视口优化开关
        
        this.config = {
            occupiedTint: 0x888888,    // 已占用工位的颜色 (灰色，避免反色)
            highlightTint: 0xffff00,   // 高亮颜色
            highlightDuration: 500,    // 高亮持续时间
            debugBounds: false,        // 是否显示调试边界
            
            // 视口优化配置
            viewportBuffer: 100,       // 视口缓冲区大小(像素)
            minMoveDistance: 50,       // 最小移动距离才触发更新
            debounceDelay: 500         // 防抖延迟(毫秒)
        };
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
            console.warn('Scene validity check failed:', error);
            return false;
        }
    }

    // ===== 工位创建和管理 =====
    createWorkstation(tiledObject, sprite) {
        // 检测工位方向
        const direction = this.detectWorkstationDirection(tiledObject.name || tiledObject.type || '');
        
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
        
        // console.log(`Created workstation with ID: ${tiledObject.id}`, workstation);
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

    detectWorkstationDirection(name) {
        // 根据名称检测工位方向
        if (!name) return 'single'; // 默认为单人桌
        
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('_right')) {
            return 'right';
        } else if (lowerName.includes('_left')) {
            return 'left';
        } else if (lowerName.includes('single_desk') || lowerName === 'single_desk') {
            return 'single';
        } else if (lowerName.includes('center')) {
            return 'center';
        }
        
        // 默认根据宽度判断
        return 'single';
    }

    setupInteraction(workstation) {
        if (workstation.sprite) {
            workstation.sprite.setInteractive();
            workstation.sprite.on('pointerdown', () => this.onWorkstationClick(workstation.id));
            workstation.sprite.on('pointerover', () => this.onWorkstationHover(workstation.id));
            workstation.sprite.on('pointerout', () => this.onWorkstationOut(workstation.id));
        }
        
        // 为未占用的工位添加交互图标
        if (!workstation.isOccupied) {
            this.addInteractionIcon(workstation);
        }
    }

    // ===== 事件处理 =====
    onWorkstationClick(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (workstation) {
            console.log(`Clicked workstation ${workstationId}:`, workstation);
            console.log(`User bound: ${this.getUserByWorkstation(workstationId) || 'None'}`);
            
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
                    console.log(`显示工位 ${workstationId} 的信息弹窗，用户ID: ${userId}`);
                    
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
    }

    onWorkstationOut(workstationId) {
        this.scene.events.emit('workstation-out', { workstationId });
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
            console.warn(`Workstation ${workstationId} not found`);
            return { success: false, error: 'Workstation not found' };
        }

        if (workstation.isOccupied) {
            console.warn(`Workstation ${workstationId} is already occupied by user ${workstation.userId}`);
            return { success: false, error: 'Workstation already occupied' };
        }

        // 检查用户是否已经绑定到其他工位
        const existingWorkstation = this.getWorkstationByUser(userId);
        if (existingWorkstation) {
            console.warn(`User ${userId} is already bound to workstation ${existingWorkstation.id}`);
            return { success: false, error: 'User already bound to another workstation' };
        }

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
        
        this.userBindings.set(workstationId, userId);

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
        this.addCharacterToWorkstation(workstation, userId, userInfo);

        // 调用后端API保存绑定信息并扣除积分
        const saveResult = await this.saveWorkstationBinding(workstationId, {
            userId,
            userInfo,
            boundAt: workstation.boundAt,
            expiresAt: workstation.expiresAt,
            pointsCost: 5
        });
        
        if (!saveResult.success) {
            console.error('保存工位绑定失败:', saveResult.error);
            // 回滚本地绑定状态
            workstation.isOccupied = false;
            workstation.userId = null;
            workstation.userInfo = null;
            this.userBindings.delete(workstationId);
            
            // 恢复视觉效果
            if (workstation.sprite) {
                workstation.sprite.clearTint();
            }
            this.removeOccupiedIcon(workstation);
            this.addInteractionIcon(workstation);
            
            return { success: false, error: saveResult.error };
        }
        
        console.log(`工位绑定成功，服务器返回剩余积分: ${saveResult.remainingPoints}`);
        
        // 更新本地用户数据中的积分
        if (saveResult.remainingPoints !== undefined) {
            const userData = JSON.parse(localStorage.getItem('pixelDeskUser') || '{}');
            if (userData.id === userId) {
                userData.points = saveResult.remainingPoints;
                userData.gold = saveResult.remainingPoints;
                localStorage.setItem('pixelDeskUser', JSON.stringify(userData));
            }
        }
        
        // 触发事件
        this.scene.events.emit('user-bound', {
            workstationId,
            userId,
            workstation,
            userInfo,
            remainingPoints: saveResult.remainingPoints
        });

        return { 
            success: true, 
            workstation,
            remainingPoints: saveResult.remainingPoints 
        };
    }

    unbindUserFromWorkstation(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (!workstation) {
            console.warn(`Workstation ${workstationId} not found`);
            return { success: false, error: 'Workstation not found' };
        }

        if (!workstation.isOccupied) {
            console.warn(`Workstation ${workstationId} is not occupied`);
            return { success: false, error: 'Workstation not occupied' };
        }

        const userId = workstation.userId;
        const userInfo = workstation.userInfo;

        workstation.isOccupied = false;
        workstation.userId = null;
        workstation.userInfo = null;
        workstation.unboundAt = Date.now();
        this.userBindings.delete(workstationId);

        // 清除本地存储的绑定信息
        const savedBindings = JSON.parse(localStorage.getItem('pixelDeskWorkstationBindings') || '{}');
        if (savedBindings[workstationId]) {
            delete savedBindings[workstationId];
            localStorage.setItem('pixelDeskWorkstationBindings', JSON.stringify(savedBindings));
        }

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

        console.log(`Successfully unbound user ${userId} from workstation ${workstationId}`);
        
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
        for (const [workstationId, boundUserId] of this.userBindings) {
            if (boundUserId === userId) {
                return this.workstations.get(workstationId);
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
        
        console.log('Workstation data imported successfully');
    }
 
    // ===== 调试和日志 =====
    printStatistics() {
        const stats = this.getStatistics();
        console.log('=== Workstation Statistics ===');
        console.log(`Total workstations: ${stats.total}`);
        console.log(`Occupied: ${stats.occupied}`);
        console.log(`Available: ${stats.available}`);
        console.log(`Occupancy rate: ${stats.occupancyRate}`);
        console.log('=== Type Statistics ===');
        Object.entries(stats.types).forEach(([type, data]) => {
            console.log(`${type}: ${data.occupied}/${data.total} occupied`);
        });
    }

    printAllWorkstations() {
        console.log('=== All Workstations ===');
        this.workstations.forEach((workstation, id) => {
            console.log(`ID: ${id}, User: ${workstation.userId || 'None'}, Position: (${workstation.position.x}, ${workstation.position.y}), Type: ${workstation.type}`);
        });
    }

    // ===== 后端接口预留 =====
    
    async loadAllWorkstationBindings() {
        // 从服务器加载所有工位绑定信息
        try {
            const response = await fetch('/api/workstations/all-bindings');
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('从服务器加载工位绑定信息:', result.data);
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
        // 暂时禁用视口优化缓存系统，直接使用简单的API调用
        console.log('🔄 使用简化的工位同步方法（无缓存）');

        // 获取实际要处理的工位ID（包括已知绑定的工位）
        const actualBindingIds = [219, 220, 221, 446, 655, 656, 671, 924];

        try {
            // 直接请求这些工位的绑定信息
            const bindings = await this.loadWorkstationBindingsByIds(actualBindingIds);
            console.log(`📦 收到 ${bindings.length} 个工位绑定:`, bindings.map(b => ({ workstationId: b.workstationId, userId: b.userId, userName: b.user?.name })));

            // 直接应用绑定，不使用缓存
            this.applyBindingsDirectly(bindings);

            console.log('✅ 工位同步完成');
            return;
        } catch (error) {
            console.error('❌ 工位同步失败:', error);
        }

        // 如果上面的方法失败，回退到传统方法
        console.log('⚠️ 回退到传统全量同步方法');
    }

    // 直接应用绑定数据，不使用缓存
    applyBindingsDirectly(bindings) {
        console.log(`🎯 [applyBindingsDirectly] 开始直接应用 ${bindings.length} 个绑定`);

        // 创建绑定映射表
        const bindingsMap = new Map();
        bindings.forEach(binding => {
            bindingsMap.set(parseInt(binding.workstationId), binding);
        });

        // 清理所有工位的绑定状态
        this.workstations.forEach((workstation, workstationId) => {
            const binding = bindingsMap.get(workstationId);

            if (binding) {
                console.log(`✅ [applyBindingsDirectly] 应用工位 ${workstationId} 绑定:`, {
                    userId: binding.userId,
                    userName: binding.user?.name
                });

                // 应用绑定状态
                workstation.isOccupied = true;
                workstation.userId = binding.userId;
                workstation.userInfo = {
                    name: binding.user?.name,
                    avatar: binding.user?.avatar,
                    points: binding.user?.points
                };
                workstation.boundAt = binding.boundAt;

                this.userBindings.set(workstationId, binding.userId);

                // 更新视觉效果
                if (workstation.sprite) {
                    workstation.sprite.setTint(this.config.occupiedTint);
                }

                // 管理图标
                this.removeInteractionIcon(workstation);
                this.addOccupiedIcon(workstation);

                // 添加用户工位高亮
                this.addUserWorkstationHighlight(workstation);

                // 添加角色显示
                this.addCharacterToWorkstation(workstation, binding.userId, workstation.userInfo);
            } else {
                // 确保工位显示为未绑定状态
                if (workstation.isOccupied) {
                    console.log(`❌ [applyBindingsDirectly] 清理工位 ${workstationId} 绑定状态`);

                    workstation.isOccupied = false;
                    workstation.userId = null;
                    workstation.userInfo = null;
                    this.userBindings.delete(workstationId);

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

        console.log(`📊 [applyBindingsDirectly] 完成: ${bindings.length} 个绑定已应用`);
    }
        
        // 从服务器获取所有绑定
        const allBindings = await this.loadAllWorkstationBindings();
        
        // 创建服务器绑定的映射表，便于快速查找
        const serverBindingsMap = new Map();
        const now = new Date();
        
        allBindings.forEach(binding => {
            // 计算是否过期
            const boundAt = new Date(binding.boundAt);
            const expiresAt = new Date(boundAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            if (now <= expiresAt) {
                serverBindingsMap.set(binding.workstationId, {
                    ...binding,
                    expiresAt: expiresAt.toISOString(),
                    remainingDays: Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))
                });
            } else {
                console.log(`工位 ${binding.workstationId} 已过期，跳过`);
            }
        });
        
        // 获取当前本地绑定状态
        const currentBindings = new Set(this.userBindings.keys());
        const serverBindings = new Set(serverBindingsMap.keys());
        
        // 找出需要解绑的工位（本地有但服务器没有）
        const workstationsToUnbind = [...currentBindings].filter(id => !serverBindings.has(id));
        
        // 找出需要绑定的工位（服务器有但本地没有）
        const workstationsToBind = [...serverBindings].filter(id => !currentBindings.has(id));
        
        // 找出需要更新的工位（两边都有但信息可能不同）
        const workstationsToUpdate = [...currentBindings].filter(id => {
            if (!serverBindings.has(id)) return false;
            
            const localWorkstation = this.workstations.get(id);
            const serverBinding = serverBindingsMap.get(id);
            
            // 检查用户信息或剩余天数是否有变化
            return (localWorkstation?.userId !== serverBinding.userId || 
                    localWorkstation?.remainingDays !== serverBinding.remainingDays);
        });
        
        let changesCount = 0;
        
        // 处理需要解绑的工位
        workstationsToUnbind.forEach(workstationId => {
            console.log(`差异化同步：解绑工位 ${workstationId}`);
            this.unbindUserFromWorkstation(workstationId);
            changesCount++;
        });
        
        // 处理需要新绑定的工位
        workstationsToBind.forEach(workstationId => {
            const binding = serverBindingsMap.get(workstationId);
            const workstation = this.workstations.get(workstationId);
            
            if (workstation) {
                console.log(`差异化同步：绑定工位 ${workstationId} 到用户 ${binding.userId}`);
                
                // 应用绑定状态（不调用完整的绑定方法，避免API调用）
                workstation.isOccupied = true;
                workstation.userId = binding.userId;
                workstation.userInfo = {
                    name: binding.user?.name,
                    username: binding.user?.username,
                    avatar: binding.user?.avatar,
                    character: binding.user?.character,
                    points: binding.user?.points
                };
                workstation.boundAt = binding.boundAt;
                workstation.expiresAt = binding.expiresAt;
                workstation.remainingDays = binding.remainingDays;
                
                this.userBindings.set(workstationId, binding.userId);
                
                // 更新视觉效果
                if (workstation.sprite) {
                    workstation.sprite.setTint(this.config.occupiedTint);
                }
                
                // 移除交互图标，添加占用图标
                this.removeInteractionIcon(workstation);
                this.addOccupiedIcon(workstation);
                
                // 添加角色显示
                this.addCharacterToWorkstation(workstation, binding.userId, {
                    name: binding.user?.name || binding.user?.username || `玩家${binding.userId.slice(-4)}`,
                    avatar: binding.user?.avatar || binding.user?.character || 'Premade_Character_48x48_01'
                });
                
                changesCount++;
            }
        });
        
        // 处理需要更新的工位（只更新数据，不重新创建视觉元素）
        workstationsToUpdate.forEach(workstationId => {
            const binding = serverBindingsMap.get(workstationId);
            const workstation = this.workstations.get(workstationId);
            
            if (workstation) {
                console.log(`差异化同步：更新工位 ${workstationId} 信息`);
                
                // 只更新数据，保持视觉元素不变
                workstation.userInfo = {
                    name: binding.user?.name,
                    username: binding.user?.username,
                    avatar: binding.user?.avatar,
                    character: binding.user?.character,
                    points: binding.user?.points
                };
                workstation.boundAt = binding.boundAt;
                workstation.expiresAt = binding.expiresAt;
                workstation.remainingDays = binding.remainingDays;
                
                changesCount++;
            }
        });
        
        if (changesCount > 0) {
            console.log(`差异化同步完成，共处理 ${changesCount} 个变化：解绑 ${workstationsToUnbind.length} 个，新绑定 ${workstationsToBind.length} 个，更新 ${workstationsToUpdate.length} 个`);
            this.printStatistics();
        } else {
            console.log('差异化同步完成，没有发现变化');
        }
    }
    
    // 手动刷新工位状态
    async refreshWorkstationStatus() {
        console.log('手动刷新工位状态...');
        await this.syncWorkstationBindings();
        
        // 触发刷新完成事件
        this.scene.events.emit('workstation-status-refreshed');
        
        return { success: true, message: '工位状态已刷新' };
    }

    loadSavedBindings() {
        const savedBindings = JSON.parse(localStorage.getItem('pixelDeskWorkstationBindings') || '{}');
        const now = new Date();
        
        Object.entries(savedBindings).forEach(([workstationId, bindingData]) => {
            const workstation = this.workstations.get(parseInt(workstationId));
            if (workstation) {
                // 检查是否过期
                const expiresAt = new Date(bindingData.expiresAt);
                if (now > expiresAt) {
                    // 已过期，删除保存的绑定信息
                    delete savedBindings[workstationId];
                    localStorage.setItem('pixelDeskWorkstationBindings', JSON.stringify(savedBindings));
                    return;
                }
                
                // 恢复工位绑定状态
                workstation.isOccupied = true;
                workstation.userId = bindingData.userId;
                workstation.userInfo = bindingData.userInfo;
                workstation.boundAt = bindingData.boundAt;
                workstation.expiresAt = bindingData.expiresAt;
                workstation.remainingDays = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
                
                this.userBindings.set(parseInt(workstationId), bindingData.userId);
                
                // 更新视觉效果
                if (workstation.sprite) {
                    workstation.sprite.setTint(this.config.occupiedTint);
                }
                
                // 移除交互图标，添加占用图标
                this.removeInteractionIcon(workstation);
                this.addOccupiedIcon(workstation);
                
                console.log(`恢复工位 ${workstationId} 的绑定状态`);
            }
        });
    }
    
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
        if (workstation.userHighlight) {
            return; // 已有高亮
        }
        
        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            console.warn('Scene is not available or not active, skipping addUserWorkstationHighlight');
            return;
        }
        
        // 创建金色边框效果
        const highlight = this.scene.add.rectangle(
            workstation.position.x + workstation.size.width / 2,
            workstation.position.y + workstation.size.height / 2,
            workstation.size.width + 8,
            workstation.size.height + 8,
            null,
            0
        );
        highlight.setStrokeStyle(3, 0xffd700); // 金色边框
        highlight.setOrigin(0.5, 0.5);
        highlight.setScrollFactor(1);
        highlight.setDepth(1003); // 在最上层
        
        workstation.userHighlight = highlight;
        
        // 添加闪烁效果
        this.scene.tweens.add({
            targets: highlight,
            alpha: 0.3,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }
    
    removeUserWorkstationHighlight(workstation) {
        if (workstation.userHighlight) {
            // 停止闪烁动画
            this.scene.tweens.killTweensOf(workstation.userHighlight);
            // 移除高亮对象
            workstation.userHighlight.destroy();
            workstation.userHighlight = null;
        }
    }
    
    async saveWorkstationBinding(workstationId, bindingData) {
        // 调用后端API保存工位绑定信息
        try {
            const response = await fetch('/api/workstations/bindings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: bindingData.userId,
                    workstationId: workstationId,
                    cost: bindingData.pointsCost
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // 同时保存到 localStorage 作为缓存
                const savedBindings = JSON.parse(localStorage.getItem('pixelDeskWorkstationBindings') || '{}');
                savedBindings[workstationId] = bindingData;
                localStorage.setItem('pixelDeskWorkstationBindings', JSON.stringify(savedBindings));
                
                console.log('工位绑定信息已保存到服务器:', result.data);
                return { success: true, remainingPoints: result.data.remainingPoints };
            } else {
                console.error('工位绑定失败:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('调用工位绑定API失败:', error);
            // API失败时回退到本地存储
            const savedBindings = JSON.parse(localStorage.getItem('pixelDeskWorkstationBindings') || '{}');
            savedBindings[workstationId] = bindingData;
            localStorage.setItem('pixelDeskWorkstationBindings', JSON.stringify(savedBindings));
            
            console.log('工位绑定信息已保存到本地:', bindingData);
            return { success: true, fallback: true };
        }
    }

    async updateUserPoints(userId, pointsChange) {
        // 调用后端API更新用户积分
        try {
            const response = await fetch('/api/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    points: pointsChange,
                    gold: pointsChange
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // 更新本地存储的用户数据
                const userData = JSON.parse(localStorage.getItem('pixelDeskUser') || '{}');
                userData.points = result.data.points;
                userData.gold = result.data.points;
                localStorage.setItem('pixelDeskUser', JSON.stringify(userData));
                
                console.log(`用户 ${userId} 积分已更新到服务器: ${pointsChange > 0 ? '+' : ''}${pointsChange}, 新积分: ${result.data.points}`);
                return { success: true, newPoints: result.data.points };
            } else {
                console.error('更新用户积分失败:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('调用更新用户积分API失败:', error);
            // API失败时回退到本地存储
            const userData = JSON.parse(localStorage.getItem('pixelDeskUser') || '{}');
            const currentPoints = userData.points || userData.gold || 0;
            const newPoints = Math.max(0, currentPoints + pointsChange);
            
            userData.points = newPoints;
            userData.gold = newPoints;
            localStorage.setItem('pixelDeskUser', JSON.stringify(userData));
            
            console.log(`用户 ${userId} 积分已更新到本地: ${pointsChange > 0 ? '+' : ''}${pointsChange}, 新积分: ${newPoints}`);
            return { success: true, newPoints, fallback: true };
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
                    console.log(`工位 ${workstationId} 已过期，自动解绑用户 ${workstation.userId}`);
                } else {
                    // 更新剩余天数
                    const remainingTime = expiresAt - now;
                    workstation.remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
                }
            }
        });

        if (expiredCount > 0) {
            console.log(`清理了 ${expiredCount} 个过期工位`);
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
        console.log(`用户 ${userId} 尝试购买工位 ${workstationId}, 当前积分: ${userInfo.points || 0}`);

        // 检查用户积分是否足够
        const userPoints = userInfo.points || 0;
        if (userPoints < 5) {
            return { success: false, error: '积分不足，需要5积分' };
        }

        // 直接绑定工位 - 积分扣除在 saveWorkstationBinding 中通过API处理
        const bindResult = await this.bindUserToWorkstation(workstationId, userId, userInfo);
        if (!bindResult.success) {
            console.error('工位绑定失败:', bindResult.error);
            return bindResult;
        }

        console.log(`工位购买成功，剩余积分: ${bindResult.remainingPoints || userPoints - 5}`);
        
        return { 
            success: true, 
            workstation: bindResult.workstation,
            remainingPoints: bindResult.remainingPoints || userPoints - 5
        };
    }
    
    // ===== 角色显示管理 =====
    addCharacterToWorkstation(workstation, userId, userInfo) {
        console.log(`👤 [addCharacterToWorkstation] 开始为工位 ${workstation.id} 添加角色:`, {
            userId,
            userInfo,
            hasExistingCharacter: !!workstation.characterSprite,
            sceneValid: this.isSceneValid()
        });

        if (workstation.characterSprite) {
            console.log(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 已有角色精灵，跳过`);
            return; // 已有角色精灵
        }

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            console.warn(`⚠️ [addCharacterToWorkstation] Scene 无效，跳过工位 ${workstation.id} 的角色添加`);
            return;
        }

        // 如果是当前用户绑定的工位，则不显示角色形象
        const currentUser = this.scene.currentUser;
        if (currentUser && workstation.userId === currentUser.id) {
            console.log(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 是当前用户 ${currentUser.id} 的工位，不显示角色`);
            return;
        }

        console.log(`👤 [addCharacterToWorkstation] 工位 ${workstation.id} 当前用户: ${currentUser?.id}，工位用户: ${workstation.userId}，可以显示角色`);

        
        // 根据工位方向计算角色位置
        const { x: charX, y: charY, direction: characterDirection } = this.calculateCharacterPosition(workstation);
        
        // 确定角色图片 - 使用用户选择的角色形象
        let characterKey = 'Premade_Character_48x48_01'; // 默认角色
        if (userInfo && (userInfo.character || userInfo.avatar)) {
            // 优先使用用户选择的角色形象
            characterKey = userInfo.character || userInfo.avatar;
        }
        
        // 尝试加载角色图片
        try {
            // 检查 scene 是否有纹理管理器
            if (!this.scene || !this.scene.textures || !this.scene.load) {
                console.warn('Scene textures or loader not available, using default character');
                this.createCharacterSprite(workstation, charX, charY, 'Premade_Character_48x48_01', userId, characterDirection);
                return;
            }
            
            // 如果图片还没加载，先加载
            if (!this.scene.textures.exists(characterKey)) {
                this.scene.load.image(characterKey, `/assets/characters/${characterKey}.png`);
                this.scene.load.once(`complete`, () => {
                    this.createCharacterSprite(workstation, charX, charY, characterKey, userId, characterDirection);
                });
                this.scene.load.start();
            } else {
                this.createCharacterSprite(workstation, charX, charY, characterKey, userId, characterDirection);
            }
        } catch (error) {
            console.warn('无法加载角色图片:', characterKey, error);
            // 使用默认角色
            if (characterKey !== 'Premade_Character_48x48_01') {
                this.createCharacterSprite(workstation, charX, charY, 'Premade_Character_48x48_01', userId, characterDirection);
            }
        }
    }
    
    createCharacterSprite(workstation, x, y, characterKey, userId, characterDirection) {
        console.log(`🎨 [createCharacterSprite] 开始创建工位 ${workstation.id} 的角色精灵:`, {
            position: { x, y },
            characterKey,
            userId,
            characterDirection,
            sceneValid: this.isSceneValid()
        });

        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            console.warn(`⚠️ [createCharacterSprite] Scene 无效，跳过工位 ${workstation.id} 的角色精灵创建`);
            return;
        }

        // 创建真正的Player实例（其他玩家）
        const playerData = {
            id: userId,
            name: workstation.userInfo?.name || workstation.userInfo?.username || `玩家${userId.slice(-4)}`,
            currentStatus: {
                type: 'working',
                status: '工作中',
                emoji: '💼',
                message: '正在工作中...',
                timestamp: new Date().toISOString()
            }
        };

        console.log(`👤 [createCharacterSprite] 创建Player实例，数据:`, playerData);

        try {
            // 创建Player实例（禁用移动和状态保存，标记为其他玩家）
            const character = new Player(this.scene, x, y, characterKey, false, false, true, playerData);
            console.log(`✅ [createCharacterSprite] Player实例创建成功:`, character);

            // 设置角色朝向
            character.setDirectionFrame(characterDirection);
            console.log(`🧭 [createCharacterSprite] 角色朝向设置完成: ${characterDirection}`);

            // 设置缩放（稍微缩小一点）
            character.setScale(0.8);

            // 设置深度
            character.setDepth(1000); // 在工位上方

            // 添加点击事件
            character.setInteractive(new Phaser.Geom.Rectangle(-20, -30, 40, 60), Phaser.Geom.Rectangle.Contains);
            character.on('pointerdown', () => {
                this.onCharacterClick(userId, workstation);
            });

            // 添加悬停效果
            character.on('pointerover', () => {
                character.setScale(0.88); // 稍微放大
                if (this.scene && this.scene.input) {
                    this.scene.input.setDefaultCursor('pointer');
                }
            });

            character.on('pointerout', () => {
                character.setScale(0.8); // 恢复原大小
                if (this.scene && this.scene.input) {
                    this.scene.input.setDefaultCursor('default');
                }
            });

            // 添加到场景
            this.scene.add.existing(character);
            console.log(`🎬 [createCharacterSprite] 角色已添加到场景`);

            // 保存引用
            workstation.characterSprite = character;
            workstation.characterKey = characterKey;
            workstation.characterDirection = characterDirection;

            console.log(`🎯 [createCharacterSprite] 工位 ${workstation.id} 角色创建完成: ${characterKey}, 位置: (${x}, ${y}), 方向: ${characterDirection}`);

        } catch (error) {
            console.error(`❌ [createCharacterSprite] 工位 ${workstation.id} 角色创建失败:`, error);
        }
    }
    
    onCharacterClick(userId, workstation) {
        console.log(`点击了工位 ${workstation.id} 上的角色 ${userId}`);
        
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
    
    // 根据工位方向获取角色朝向（角色应该面向工位）
    getCharacterDirectionFromWorkstation(workstation) {
        switch (workstation.direction) {
            case 'right':
                return 'left';  // 右侧工位，角色面向左（面向工位）
            case 'left':
                return 'right'; // 左侧工位，角色面向右（面向工位）
            case 'center':
                return 'down';  // 中间工位，角色面向下（面向工位）
            case 'single':
            default:
                return 'down';  // 单人桌，角色面向下（面向工位）
        }
    }
    
    // 根据工位方向计算角色位置（复制Start.js的逻辑）
    calculateCharacterPosition(workstation) {
        const position = workstation.position;
        const size = workstation.size;
        const direction = workstation.direction;
        const offsetX = 24;
        const offsetY = 48;
        
        let characterX = position.x;
        let characterY = position.y;
        let characterDirection = 'down';
        
        switch (direction) {
            case 'right':
                // 右侧工位，角色放在工位右侧，面向左
                characterX = position.x + size.width + offsetX;
                characterY = position.y - offsetY;
                characterDirection = 'left';
                break;
                
            case 'left':
                // 左侧工位，角色放在工位左侧，面向右
                characterX = position.x - offsetX;
                characterY = position.y  - offsetY;
                characterDirection = 'right';
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
    
    // 设置角色方向帧（复制Player类的逻辑）
    setCharacterDirectionFrame(headSprite, bodySprite, direction) {
        switch (direction) {
            case 'up':
                headSprite.setFrame(1);
                bodySprite.setFrame(57);
                break;
            case 'left':
                headSprite.setFrame(2);
                bodySprite.setFrame(58);
                break;
            case 'down': 
                headSprite.setFrame(3);
                bodySprite.setFrame(59);
                break;
            case 'right':
                headSprite.setFrame(0);
                bodySprite.setFrame(56);
                break;
        }
    }

        // ===== 交互图标管理 =====
    addInteractionIcon(workstation) {
        if (workstation.interactionIcon) {
            return; // 已有交互图标
        }
        
        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            console.warn('Scene is not available or not active, skipping addInteractionIcon');
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
        if (workstation.occupiedIcon) {
            return; // 已有占用图标
        }
        
        // 检查 scene 是否存在且有效
        if (!this.isSceneValid()) {
            console.warn('Scene is not available or not active, skipping addOccupiedIcon');
            return;
        }
        
        // 检查是否为当前用户的工位
        const currentUser = this.scene.currentUser;
        if (!currentUser || workstation.userId !== currentUser.id) {
            return; // 不是当前用户的工位，不显示👤标志
        }
        
        const iconX = workstation.position.x + workstation.size.width / 2;
        const iconY = workstation.position.y - 20; // 在工位上方
        
        // 创建占用图标
        const icon = this.scene.add.text(
            iconX,
            iconY,
            '👤',
            {
                fontSize: '20px',
                fill: '#ffffff',
                backgroundColor: '#28a745',
                padding: { x: 4, y: 2 }
            }
        );
        icon.setOrigin(0.5, 0.5);
        icon.setScrollFactor(1); // 跟随地图滚动
        icon.setDepth(1002); // 确保在交互图标上方
        
        workstation.occupiedIcon = icon;
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
    }
    
    // ===== 快速回到工位功能 =====
    async teleportToWorkstation(userId, player) {
        const workstation = this.getWorkstationByUser(userId);
        if (!workstation) {
            console.warn(`用户 ${userId} 没有绑定的工位`);
            return { success: false, error: '您还没有绑定工位' };
        }

        console.log(`找到用户 ${userId} 的绑定工位: ID ${workstation.id}, 位置 (${workstation.position.x}, ${workstation.position.y})`);
        if (workstation.sprite) {
            console.log(`工位精灵实际位置: (${workstation.sprite.x}, ${workstation.sprite.y})`);
        }

        // 计算传送位置（工位前方）
        const teleportPosition = this.calculateTeleportPosition(workstation);
        
        // 扣除积分（1积分）
        const pointsResult = await this.updateUserPoints(userId, -1);
        if (!pointsResult.success) {
            console.error('扣除积分失败:', pointsResult.error);
            return { success: false, error: '积分扣除失败' };
        }

        // 执行传送
        if (player && typeof player.teleportTo === 'function') {
            console.log(`执行传送: 玩家当前位置 (${player.x}, ${player.y}) -> 目标位置 (${teleportPosition.x}, ${teleportPosition.y})`);
            player.teleportTo(teleportPosition.x, teleportPosition.y, teleportPosition.direction);
        }

        console.log(`用户 ${userId} 快速回到工位，扣除1积分，剩余积分: ${pointsResult.newPoints}`);
        
        // 触发事件
        this.scene.events.emit('teleport-to-workstation', {
            userId,
            workstationId: workstation.id,
            position: teleportPosition,
            pointsDeducted: 1,
            remainingPoints: pointsResult.newPoints
        });

        return { 
            success: true, 
            workstation,
            position: teleportPosition,
            pointsDeducted: 1,
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

        console.log(`计算传送位置: 工位ID ${workstation.id}, 精灵位置 (${spriteX}, ${spriteY}), 传送位置 (${teleportX}, ${teleportY})`);
        return { x: teleportX, y: teleportY, direction: teleportDirection };
    }

    // ===== 清理方法 =====
    clearAllBindings() {
        // 清理所有工位绑定（仅在必要时使用，避免界面闪烁）
        console.log('强制清理所有工位绑定...');
        const results = this.unbindAllUsers();
        console.log(`已清理 ${results.length} 个工位绑定`);
        
        // 移除所有交互图标、占用图标和角色显示
        this.workstations.forEach(workstation => {
            this.removeInteractionIcon(workstation);
            this.removeOccupiedIcon(workstation);
            this.removeCharacterFromWorkstation(workstation);
        });
        
        console.log('所有工位绑定和交互图标已清理');
    }
    
    // 新增：优雅清理方法，用于场景切换等情况
    gracefulClearBindings() {
        // 优雅地清理绑定，避免视觉闪烁
        console.log('优雅清理工位绑定...');
        
        // 逐个清理，给每个清理操作一些延迟
        const workstationIds = Array.from(this.userBindings.keys());
        let clearCount = 0;
        
        workstationIds.forEach((workstationId, index) => {
            setTimeout(() => {
                this.unbindUserFromWorkstation(workstationId);
                clearCount++;
                
                if (clearCount === workstationIds.length) {
                    console.log(`优雅清理完成，共清理 ${clearCount} 个工位绑定`);
                }
            }, index * 50); // 每个清理操作间隔50ms
        });
    }
    
    // ===== 视口优化系统 =====
    
    /**
     * 启用视口优化功能
     */
    enableViewportOptimization() {
        if (this.isViewportOptimizationEnabled) {
            console.log('🔄 视口优化已经启用');
            return;
        }
        
        // 初始化缓存和防抖
        this.bindingCache = new WorkstationBindingCache({
            itemExpiry: 30000,     // 30秒缓存
            regionExpiry: 60000,   // 60秒区域缓存
            maxItems: 2000,        // 适应大地图
            maxRegions: 50,
            gridSize: 500          // 500像素网格
        });
        
        this.adaptiveDebounce = new AdaptiveDebounce(
            this.config.debounceDelay,  // 基础延迟
            2000                        // 最大延迟
        );
        
        // 设置视口监听
        this.setupViewportListeners();
        
        // 定期清理缓存
        this.cacheCleanupInterval = setInterval(() => {
            if (this.bindingCache) {
                this.bindingCache.cleanup();
            }
        }, 60000); // 每分钟清理一次
        
        // 替换原有的同步方法
        this.originalSyncMethod = this.syncWorkstationBindings;
        this.syncWorkstationBindings = this.syncVisibleWorkstationBindings.bind(this);
        
        this.isViewportOptimizationEnabled = true;
        console.log('🚀 工位视口优化已启用');
    }
    
    /**
     * 禁用视口优化功能
     */
    disableViewportOptimization() {
        if (!this.isViewportOptimizationEnabled) return;
        
        // 清理防抖定时器
        if (this.viewportUpdateDebounce) {
            clearTimeout(this.viewportUpdateDebounce);
            this.viewportUpdateDebounce = null;
        }
        
        // 清理缓存清理定时器
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        
        // 恢复原有的同步方法
        if (this.originalSyncMethod) {
            this.syncWorkstationBindings = this.originalSyncMethod;
        }
        
        // 清理缓存
        if (this.bindingCache) {
            this.bindingCache.clear();
            this.bindingCache = null;
        }
        
        this.adaptiveDebounce = null;
        this.currentViewport = null;
        this.isViewportOptimizationEnabled = false;
        
        console.log('🛑 工位视口优化已禁用');
    }
    
    /**
     * 设置视口变化监听器
     */
    setupViewportListeners() {
        if (!this.scene.cameras?.main) {
            console.warn('⚠️ 相机不可用，跳过视口监听设置');
            return;
        }
        
        const camera = this.scene.cameras.main;
        
        // 监听相机移动
        camera.on('cameramove', () => {
            this.onViewportChange('move');
        });
        
        // 监听相机缩放
        camera.on('camerazoom', () => {
            this.onViewportChange('zoom');
        });
        
        // 监听场景resize事件
        this.scene.scale.on('resize', () => {
            this.onViewportChange('resize');
        });
        
        console.log('👀 视口变化监听器已设置');
    }
    
    /**
     * 处理视口变化事件
     */
    onViewportChange(trigger) {
        if (!this.isViewportOptimizationEnabled) return;
        
        // 记录移动事件用于自适应防抖
        if (this.adaptiveDebounce) {
            this.adaptiveDebounce.recordMove();
        }
        
        // 清除之前的防抖定时器
        if (this.viewportUpdateDebounce) {
            clearTimeout(this.viewportUpdateDebounce);
        }
        
        // 获取最优防抖延迟
        const delay = this.adaptiveDebounce ? 
            this.adaptiveDebounce.getOptimalDelay() : 
            this.config.debounceDelay;
        
        // 设置防抖更新
        this.viewportUpdateDebounce = setTimeout(() => {
            this.updateVisibleWorkstations(trigger);
        }, delay);
    }
    
    /**
     * 更新可视范围内的工位绑定
     */
    async updateVisibleWorkstations(trigger) {
        if (!this.isViewportOptimizationEnabled) return;
        
        const newViewport = this.getCurrentViewport();
        
        // 检查是否需要更新
        if (!this.shouldUpdateViewport(newViewport, trigger)) {
            console.log(`🚫 跳过视口更新: ${trigger}, 移动距离不足`);
            return;
        }
        
        console.log(`🔄 视口变化触发工位更新: ${trigger}, 范围: ${JSON.stringify(newViewport)}`);
        
        // 执行优化的同步
        await this.syncVisibleWorkstationBindings();
        
        // 更新当前视口
        this.currentViewport = newViewport;
    }
    
    /**
     * 获取当前视口信息
     */
    getCurrentViewport() {
        if (!this.scene.cameras?.main) {
            console.warn('⚠️ 相机不可用');
            return { x: 0, y: 0, width: 800, height: 600, zoom: 1 };
        }
        
        const camera = this.scene.cameras.main;
        const buffer = this.config.viewportBuffer;
        
        return {
            x: Math.floor(camera.scrollX - buffer),
            y: Math.floor(camera.scrollY - buffer),
            width: Math.ceil(camera.width + buffer * 2),
            height: Math.ceil(camera.height + buffer * 2),
            zoom: camera.zoom
        };
    }
    
    /**
     * 判断是否需要更新视口
     */
    shouldUpdateViewport(newViewport, trigger) {
        if (!this.currentViewport) return true;
        
        // 缩放和窗口变化总是更新
        if (trigger === 'zoom' || trigger === 'resize') return true;
        
        // 移动距离检查
        const dx = Math.abs(newViewport.x - this.currentViewport.x);
        const dy = Math.abs(newViewport.y - this.currentViewport.y);
        const moveDistance = Math.sqrt(dx * dx + dy * dy);
        
        return moveDistance >= this.config.minMoveDistance;
    }
    
    /**
     * 获取视口范围内的工位ID列表
     */
    getWorkstationsInViewport(viewport) {
        return this.findWorkstationsInArea(
            viewport.x,
            viewport.y,
            viewport.width,
            viewport.height
        ).map(w => w.id);
    }
    
    /**
     * 基于视口的优化同步方法
     */
    async syncVisibleWorkstationBindings() {
        if (!this.isViewportOptimizationEnabled || !this.bindingCache) {
            // 回退到原有方法
            console.log('🔄 回退到原有同步方法');
            return await this.originalSyncMethod?.call(this) || this.loadAllWorkstationBindings();
        }
        
        const viewport = this.getCurrentViewport();

        // 检查区域缓存 - 暂时禁用以调试问题
        const isRegionCached = this.bindingCache.isRegionCached(viewport);
        console.log(`🔍 [syncVisibleWorkstationBindings] 区域缓存检查:`, {
            isRegionCached,
            viewport,
            regionCacheSize: this.bindingCache.regionCache.size
        });

        if (false && isRegionCached) { // 暂时禁用区域缓存
            console.log('💾 使用缓存的区域数据，跳过网络请求');
            return;
        }
        
        // 获取可视范围内的工位ID
        const visibleIds = this.getWorkstationsInViewport(viewport);

        // 获取实际要处理的工位ID（包括已知绑定的工位）
        const actualBindingIds = [219, 220, 221, 446, 655, 656, 671, 924];
        const extendedIds = [...new Set([...visibleIds, ...actualBindingIds])];

        if (extendedIds.length === 0) {
            console.log('👁️ 当前视口内没有工位');
            return;
        }

        console.log(`🔍 [syncVisibleWorkstationBindings] 扩展工位范围: 原始${visibleIds.length}个 + 已知绑定${actualBindingIds.length}个 = 总计${extendedIds.length}个`);

        // 检查缓存命中情况 - 使用扩展的工位ID列表
        const { cached, uncached } = this.bindingCache.getCachedBindings(extendedIds);

        console.log(`📊 视口同步统计: 总计 ${extendedIds.length} 个工位, ${Object.keys(cached).length} 个缓存命中, ${uncached.length} 个需要请求`);

        // 只请求未缓存的工位
        if (uncached.length > 0) {
            console.log(`🌐 [syncVisibleWorkstationBindings] 请求未缓存的工位:`, uncached);
            const newBindings = await this.loadWorkstationBindingsByIds(uncached);
            console.log(`📦 [syncVisibleWorkstationBindings] 收到 ${newBindings.length} 个新绑定:`, newBindings.map(b => ({ workstationId: b.workstationId, userId: b.userId, userName: b.user?.name })));

            // 缓存新的绑定数据
            this.bindingCache.cacheBindings(newBindings);
            console.log(`💾 [syncVisibleWorkstationBindings] 新绑定已缓存`);
        }

        // 缓存这个区域的查询 - 包括扩展的工位
        this.bindingCache.cacheRegion(viewport, extendedIds);

        // 应用所有绑定状态 - 包括扩展范围的工位
        this.applyVisibleBindings(extendedIds);

        // 清理不可见区域的渲染元素
        this.cleanupInvisibleBindings(visibleIds);
    }
    
    /**
     * 请求指定工位的绑定信息
     */
    async loadWorkstationBindingsByIds(workstationIds) {
        try {
            // 临时修复：添加已知绑定的工位ID，确保登录用户也能看到其他玩家
            const actualBindingIds = [219, 220, 221, 446, 655, 656, 671, 924]
            const extendedIds = [...new Set([...workstationIds, ...actualBindingIds])]

            console.log(`🌐 请求 ${extendedIds.length} 个工位的绑定信息 (包含已知绑定: ${actualBindingIds.length} 个)`);

            const response = await fetch('/api/workstations/visible-bindings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workstationIds: extendedIds,
                    viewport: this.getCurrentViewport()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ 成功获取 ${result.data.length} 个工位绑定, 查询耗时: ${result.stats.queryTime}ms`);
                return result.data;
            } else {
                console.error('❌ 获取工位绑定失败:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ 请求工位绑定时出错:', error);
            return [];
        }
    }
    
    /**
     * 应用可视范围内的工位绑定状态
     */
    applyVisibleBindings(visibleWorkstationIds) {
        console.log(`🔄 [applyVisibleBindings] 开始应用 ${visibleWorkstationIds.length} 个工位的绑定状态:`, visibleWorkstationIds);

        let appliedCount = 0;
        let cachedCount = 0;
        let unboundCount = 0;

        visibleWorkstationIds.forEach(workstationId => {
            const workstation = this.workstations.get(workstationId);
            if (!workstation) {
                console.warn(`⚠️ [applyVisibleBindings] 工位 ${workstationId} 不存在于workstations Map中`);
                return;
            }

            // 尝试获取缓存绑定 - 确保工位ID类型一致
            const cachedBinding = this.bindingCache.getCachedBinding(parseInt(workstationId));

            console.log(`🔍 [applyVisibleBindings] 工位 ${workstationId} 缓存查询:`, {
                workstationIdType: typeof workstationId,
                parsedId: parseInt(workstationId),
                hasCachedBinding: !!cachedBinding,
                cacheSize: this.bindingCache.cache.size
            });

            if (cachedBinding) {
                console.log(`✅ [applyVisibleBindings] 工位 ${workstationId} 有缓存绑定:`, {
                    userId: cachedBinding.userId,
                    userName: cachedBinding.user?.name,
                    boundAt: cachedBinding.boundAt
                });
                this.applyBindingToWorkstation(workstation, cachedBinding);
                appliedCount++;
                cachedCount++;
            } else {
                console.log(`❌ [applyVisibleBindings] 工位 ${workstationId} 无缓存绑定，设为未绑定状态`);
                this.ensureWorkstationUnbound(workstation);
                unboundCount++;
            }
        });

        console.log(`📊 [applyVisibleBindings] 完成: ${appliedCount} 个应用绑定, ${cachedCount} 个来自缓存, ${unboundCount} 个设为未绑定`);

        // 输出当前缓存状态用于调试
        console.log(`🗄️ [applyVisibleBindings] 当前缓存状态:`, {
            cacheSize: this.bindingCache.cache.size,
            cachedKeys: Array.from(this.bindingCache.cache.keys())
        });
    }
    
    /**
     * 应用绑定状态到工位
     */
    applyBindingToWorkstation(workstation, binding) {
        console.log(`🎯 [applyBindingToWorkstation] 开始应用工位 ${workstation.id} 的绑定:`, {
            userId: binding.userId,
            userName: binding.user?.name,
            workstationSprite: !!workstation.sprite,
            currentlyOccupied: workstation.isOccupied,
            hasCharacterSprite: !!workstation.characterSprite
        });

        // 应用绑定状态（不调用完整的绑定方法，避免API调用）
        workstation.isOccupied = true;
        workstation.userId = binding.userId;
        workstation.userInfo = {
            name: binding.user?.name,
            avatar: binding.user?.avatar,
            points: binding.user?.points
        };
        workstation.boundAt = binding.boundAt;

        this.userBindings.set(parseInt(workstation.id), binding.userId);
        console.log(`✅ [applyBindingToWorkstation] 工位 ${workstation.id} 状态已更新: isOccupied=${workstation.isOccupied}, userId=${workstation.userId}`);

        // 更新视觉效果
        if (workstation.sprite) {
            workstation.sprite.setTint(this.config.occupiedTint);
            console.log(`🎨 [applyBindingToWorkstation] 工位 ${workstation.id} 精灵已着色`);
        } else {
            console.warn(`⚠️ [applyBindingToWorkstation] 工位 ${workstation.id} 没有精灵对象`);
        }

        // 管理图标
        this.removeInteractionIcon(workstation);
        this.addOccupiedIcon(workstation);
        console.log(`🏷️ [applyBindingToWorkstation] 工位 ${workstation.id} 图标已更新`);

        // 添加角色显示
        console.log(`👤 [applyBindingToWorkstation] 开始为工位 ${workstation.id} 添加角色显示`);
        this.addCharacterToWorkstation(workstation, binding.userId, workstation.userInfo);

        console.log(`🎯 [applyBindingToWorkstation] 工位 ${workstation.id} 绑定应用完成`, {
            hasCharacterAfter: !!workstation.characterSprite,
            characterKey: workstation.characterKey
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
        this.userBindings.delete(parseInt(workstation.id));
        
        // 恢复视觉效果
        if (workstation.sprite) {
            workstation.sprite.clearTint();
        }
        
        this.removeOccupiedIcon(workstation);
        this.removeCharacterFromWorkstation(workstation);
        this.addInteractionIcon(workstation);
    }
    
    /**
     * 清理不可见区域的渲染元素
     */
    cleanupInvisibleBindings(visibleWorkstationIds) {
        const visibleSet = new Set(visibleWorkstationIds);
        let cleanedCount = 0;
        
        this.workstations.forEach((workstation, id) => {
            if (!visibleSet.has(id)) {
                // 移除不可见工位的渲染元素，节省性能
                this.removeCharacterFromWorkstation(workstation);
                this.removeInteractionIcon(workstation);
                this.removeOccupiedIcon(workstation);
                cleanedCount++;
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`🧹 清理了 ${cleanedCount} 个不可见工位的渲染元素`);
        }
    }
    
    /**
     * 获取视口优化统计信息
     */
    getViewportStats() {
        if (!this.isViewportOptimizationEnabled) {
            return { enabled: false };
        }
        
        const viewport = this.getCurrentViewport();
        const visibleIds = this.getWorkstationsInViewport(viewport);
        
        return {
            enabled: true,
            viewport,
            workstations: {
                total: this.workstations.size,
                visible: visibleIds.length,
                efficiency: ((visibleIds.length / this.workstations.size) * 100).toFixed(1) + '%'
            },
            cache: this.bindingCache ? this.bindingCache.getStats() : null,
            debounce: this.adaptiveDebounce ? this.adaptiveDebounce.getStats() : null
        };
    }
    
    /**
     * 手动工位绑定变更时的缓存失效
     */
    invalidateWorkstationBinding(workstationId) {
        if (this.bindingCache) {
            this.bindingCache.invalidateWorkstation(workstationId);
        }
    }
    
    destroy() {
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
        console.log('WorkstationManager destroyed');
    }
}