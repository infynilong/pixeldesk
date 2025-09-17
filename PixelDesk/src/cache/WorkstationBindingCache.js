/**
 * 工位绑定缓存管理类
 * 支持单项缓存和区域级缓存，优化视口变化时的查询性能
 */
export class WorkstationBindingCache {
    constructor(options = {}) {
        this.cache = new Map();        // 单项缓存：workstationId -> 绑定数据
        this.regionCache = new Map();  // 区域缓存：regionKey -> 工位ID列表
        
        this.config = {
            itemExpiry: 30000,        // 单项缓存30秒过期
            regionExpiry: 60000,      // 区域缓存60秒过期
            maxItems: 1000,           // 最大缓存项数
            maxRegions: 50,           // 最大缓存区域数
            gridSize: 500,            // 区域网格大小(像素)
            ...options
        };
        
        console.log('🗄️ WorkstationBindingCache initialized with config:', this.config);
    }

    /**
     * 生成区域键值
     * 基于网格坐标和缩放级别生成唯一的区域标识
     */
    getRegionKey(viewport) {
        const gridX = Math.floor(viewport.x / this.config.gridSize);
        const gridY = Math.floor(viewport.y / this.config.gridSize);
        const zoomLevel = Math.floor((viewport.zoom || 1) * 10); // 缩放精度到0.1
        return `${gridX}_${gridY}_${zoomLevel}`;
    }

    /**
     * 检查区域是否已缓存且未过期
     */
    isRegionCached(viewport) {
        const regionKey = this.getRegionKey(viewport);
        const cached = this.regionCache.get(regionKey);
        
        if (!cached) return false;
        
        const now = Date.now();
        if (now - cached.timestamp > this.config.regionExpiry) {
            this.regionCache.delete(regionKey);
            console.log(`🗑️ 区域缓存过期并清理: ${regionKey}`);
            return false;
        }
        
        return true;
    }

    /**
     * 缓存区域查询结果
     */
    cacheRegion(viewport, workstationIds) {
        const regionKey = this.getRegionKey(viewport);
        this.regionCache.set(regionKey, {
            workstationIds: [...workstationIds], // 创建副本
            timestamp: Date.now(),
            viewport: { ...viewport }
        });
        
        this.limitRegionCache();
        console.log(`💾 缓存区域: ${regionKey}, 工位数: ${workstationIds.length}`);
    }

    /**
     * 获取缓存的单个工位绑定
     */
    getCachedBinding(workstationId) {
        const cached = this.cache.get(workstationId);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.config.itemExpiry) {
            this.cache.delete(workstationId);
            return null;
        }
        
        return cached.data;
    }

    /**
     * 批量获取缓存的绑定，返回缓存命中和未命中的分组
     */
    getCachedBindings(workstationIds) {
        const cached = {};
        const uncached = [];

        console.log(`🔍 [getCachedBindings] 查询 ${workstationIds.length} 个工位的缓存:`, workstationIds);
        console.log(`🗄️ [getCachedBindings] 当前缓存大小: ${this.cache.size}, 缓存键值:`, Array.from(this.cache.keys()));

        workstationIds.forEach(id => {
            // 确保ID为数字类型进行查询
            const numericId = parseInt(id);
            const binding = this.getCachedBinding(numericId);

            console.log(`🔍 [getCachedBindings] 工位 ${id} (${typeof id} -> ${numericId}) 缓存结果:`, !!binding);

            if (binding) {
                cached[id] = binding;
            } else {
                uncached.push(id);
            }
        });

        const hitRate = Object.keys(cached).length / workstationIds.length;
        console.log(`🎯 缓存命中率: ${(hitRate * 100).toFixed(1)}% (${Object.keys(cached).length}/${workstationIds.length})`);

        return { cached, uncached };
    }

    /**
     * 缓存绑定数据
     */
    cacheBindings(bindings) {
        const now = Date.now();
        let newCacheCount = 0;

        bindings.forEach(binding => {
            if (binding && binding.workstationId) {
                // 确保工位ID为数字类型
                const workstationId = parseInt(binding.workstationId);
                this.cache.set(workstationId, {
                    data: binding,
                    timestamp: now
                });
                console.log(`💾 [cacheBindings] 缓存工位 ${workstationId} 绑定:`, {
                    userId: binding.userId,
                    userName: binding.user?.name
                });
                newCacheCount++;
            }
        });

        this.limitItemCache();
        console.log(`💾 新增缓存 ${newCacheCount} 个工位绑定`);
    }

    /**
     * 限制项目缓存大小，使用LRU策略
     */
    limitItemCache() {
        if (this.cache.size <= this.config.maxItems) return;
        
        // 按时间戳排序，删除最旧的条目
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toDelete = entries.slice(0, entries.length - this.config.maxItems);
        toDelete.forEach(([id]) => this.cache.delete(id));
        
        console.log(`🧹 清理了 ${toDelete.length} 个过期的工位缓存`);
    }

    /**
     * 限制区域缓存大小
     */
    limitRegionCache() {
        if (this.regionCache.size <= this.config.maxRegions) return;
        
        const entries = Array.from(this.regionCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toDelete = entries.slice(0, entries.length - this.config.maxRegions);
        toDelete.forEach(([key]) => this.regionCache.delete(key));
        
        console.log(`🧹 清理了 ${toDelete.length} 个过期的区域缓存`);
    }

    /**
     * 主动清理过期缓存
     */
    cleanup() {
        const now = Date.now();
        let itemsDeleted = 0;
        let regionsDeleted = 0;
        
        // 清理项目缓存
        for (const [id, cached] of this.cache) {
            if (now - cached.timestamp > this.config.itemExpiry) {
                this.cache.delete(id);
                itemsDeleted++;
            }
        }
        
        // 清理区域缓存
        for (const [key, cached] of this.regionCache) {
            if (now - cached.timestamp > this.config.regionExpiry) {
                this.regionCache.delete(key);
                regionsDeleted++;
            }
        }
        
        if (itemsDeleted > 0 || regionsDeleted > 0) {
            console.log(`🧹 定期清理: 删除 ${itemsDeleted} 个工位缓存, ${regionsDeleted} 个区域缓存`);
        }
    }

    /**
     * 清空指定工位的缓存（用于工位状态变更时）
     */
    invalidateWorkstation(workstationId) {
        const deleted = this.cache.delete(workstationId);
        if (deleted) {
            console.log(`🔄 工位 ${workstationId} 缓存已失效`);
        }
    }

    /**
     * 清空所有缓存
     */
    clear() {
        const itemCount = this.cache.size;
        const regionCount = this.regionCache.size;
        
        this.cache.clear();
        this.regionCache.clear();
        
        console.log(`🗑️ 清空所有缓存: ${itemCount} 个工位缓存, ${regionCount} 个区域缓存`);
    }

    /**
     * 获取缓存统计信息
     */
    getStats() {
        const now = Date.now();
        let expiredItems = 0;
        let expiredRegions = 0;
        
        // 统计过期项目
        for (const cached of this.cache.values()) {
            if (now - cached.timestamp > this.config.itemExpiry) {
                expiredItems++;
            }
        }
        
        // 统计过期区域
        for (const cached of this.regionCache.values()) {
            if (now - cached.timestamp > this.config.regionExpiry) {
                expiredRegions++;
            }
        }
        
        return {
            items: {
                total: this.cache.size,
                expired: expiredItems,
                active: this.cache.size - expiredItems,
                maxCapacity: this.config.maxItems
            },
            regions: {
                total: this.regionCache.size,
                expired: expiredRegions,
                active: this.regionCache.size - expiredRegions,
                maxCapacity: this.config.maxRegions
            },
            efficiency: {
                itemUtilization: ((this.cache.size / this.config.maxItems) * 100).toFixed(1) + '%',
                regionUtilization: ((this.regionCache.size / this.config.maxRegions) * 100).toFixed(1) + '%'
            },
            config: {
                itemExpiry: this.config.itemExpiry,
                regionExpiry: this.config.regionExpiry,
                gridSize: this.config.gridSize
            }
        };
    }

    /**
     * 打印缓存统计信息（调试用）
     */
    printStats() {
        const stats = this.getStats();
        console.log('📊 WorkstationBindingCache 统计信息:');
        console.log(`   工位缓存: ${stats.items.active}/${stats.items.total} 活跃 (容量: ${stats.items.maxCapacity})`);
        console.log(`   区域缓存: ${stats.regions.active}/${stats.regions.total} 活跃 (容量: ${stats.regions.maxCapacity})`);
        console.log(`   利用率: 工位 ${stats.efficiency.itemUtilization}, 区域 ${stats.efficiency.regionUtilization}`);
        return stats;
    }
}

/**
 * 自适应防抖类
 * 根据用户行为动态调整防抖延迟时间
 */
export class AdaptiveDebounce {
    constructor(baseDelay = 500, maxDelay = 2000) {
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.recentMoves = [];
        this.maxHistory = 10;
        
        console.log(`⏱️ AdaptiveDebounce initialized: base=${baseDelay}ms, max=${maxDelay}ms`);
    }
    
    /**
     * 根据最近的移动频率计算最优防抖延迟
     */
    getOptimalDelay() {
        const now = Date.now();
        // 只保留最近5秒内的移动记录
        this.recentMoves = this.recentMoves.filter(time => now - time < 5000);
        
        if (this.recentMoves.length > 5) {
            // 频繁移动时延长防抖时间，减少请求频率
            const multiplier = Math.min(2, 1 + (this.recentMoves.length - 5) * 0.2);
            const adaptedDelay = Math.min(this.maxDelay, this.baseDelay * multiplier);
            console.log(`⏱️ 适应性防抖: ${this.recentMoves.length} 次移动，延迟调整为 ${adaptedDelay}ms`);
            return adaptedDelay;
        }
        
        return this.baseDelay;
    }
    
    /**
     * 记录一次移动事件
     */
    recordMove() {
        this.recentMoves.push(Date.now());
        // 限制历史记录大小
        if (this.recentMoves.length > this.maxHistory) {
            this.recentMoves.shift();
        }
    }
    
    /**
     * 获取防抖统计信息
     */
    getStats() {
        const now = Date.now();
        const recentCount = this.recentMoves.filter(time => now - time < 5000).length;
        
        return {
            recentMoves: recentCount,
            currentDelay: this.getOptimalDelay(),
            baseDelay: this.baseDelay,
            maxDelay: this.maxDelay
        };
    }
}