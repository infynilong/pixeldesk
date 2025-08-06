export class WorkstationManager {
    constructor(scene) {
        this.scene = scene;
        this.workstations = new Map(); // 存储工位信息：id -> workstation对象
        this.userBindings = new Map();  // 存储用户绑定：workstationId -> userId
        this.config = {
            occupiedTint: 0x00ff00,    // 已占用工位的颜色
            highlightTint: 0xffff00,   // 高亮颜色
            highlightDuration: 500,    // 高亮持续时间
            debugBounds: true          // 是否显示调试边界
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
            metadata: this.extractMetadata(tiledObject)
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
    }

    // ===== 事件处理 =====
    onWorkstationClick(workstationId) {
        const workstation = this.workstations.get(workstationId);
        if (workstation) {
            console.log(`Clicked workstation ${workstationId}:`, workstation);
            console.log(`User bound: ${this.getUserByWorkstation(workstationId) || 'None'}`);
            
            this.highlightWorkstation(workstationId);
            
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
    bindUserToWorkstation(workstationId, userId, userInfo = {}) {
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

        // 绑定用户
        workstation.isOccupied = true;
        workstation.userId = userId;
        workstation.userInfo = userInfo;
        workstation.boundAt = Date.now();
        this.userBindings.set(workstationId, userId);

        // 更新视觉效果
        if (workstation.sprite) {
            workstation.sprite.setTint(this.config.occupiedTint);
        }

        // console.log(`Successfully bound user ${userId} to workstation ${workstationId}`);
        
        // 触发事件
        this.scene.events.emit('user-bound', {
            workstationId,
            userId,
            workstation,
            userInfo
        });

        return { success: true, workstation };
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

        // 恢复视觉效果
        if (workstation.sprite) {
            workstation.sprite.clearTint();
        }

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

    // ===== 清理方法 =====
    destroy() {
        // 清理所有事件监听器
        this.workstations.forEach(workstation => {
            if (workstation.sprite) {
                workstation.sprite.removeAllListeners();
            }
        });
        
        this.workstations.clear();
        this.userBindings.clear();
        console.log('WorkstationManager destroyed');
    }
}