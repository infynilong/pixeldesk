export class WorkstationManager {
    constructor(scene) {
        this.scene = scene;
        this.workstations = new Map(); // 存储工位信息：id -> workstation对象
        this.userBindings = new Map();  // 存储用户绑定：workstationId -> userId
        this.config = {
            occupiedTint: 0x888888,    // 已占用工位的颜色 (灰色，避免反色)
            highlightTint: 0xffff00,   // 高亮颜色
            highlightDuration: 500,    // 高亮持续时间
            debugBounds: false         // 是否显示调试边界
        };
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

        // ===== 交互图标管理 =====
    addInteractionIcon(workstation) {
        if (workstation.interactionIcon) {
            return; // 已有交互图标
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
            this.scene.input.setDefaultCursor('pointer');
        });
        icon.on('pointerout', () => {
            icon.setScale(1);
            this.scene.input.setDefaultCursor('default');
        });
        
        workstation.interactionIcon = icon;
    }

    addOccupiedIcon(workstation) {
        if (workstation.occupiedIcon) {
            return; // 已有占用图标
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
    
    // ===== 清理方法 =====
    clearAllBindings() {
        // 清理所有工位绑定
        console.log('清理所有工位绑定...');
        const results = this.unbindAllUsers();
        console.log(`已清理 ${results.length} 个工位绑定`);
        
        // 移除所有交互图标和占用图标
        this.workstations.forEach(workstation => {
            this.removeInteractionIcon(workstation);
            this.removeOccupiedIcon(workstation);
        });
        
        console.log('所有工位绑定和交互图标已清理');
    }
    
    destroy() {
        // 清理所有事件监听器和交互图标
        this.workstations.forEach(workstation => {
            if (workstation.sprite) {
                workstation.sprite.removeAllListeners();
            }
            this.removeInteractionIcon(workstation);
            this.removeOccupiedIcon(workstation);
        });
        
        this.workstations.clear();
        this.userBindings.clear();
        console.log('WorkstationManager destroyed');
    }
}