/**
 * 前台客服管理器
 * 负责管理前台客服对象（不创建精灵，而是管理由地图创建的精灵）
 * 与 AiNpcManager 类似，但专门用于固定位置的客服前台
 */
export class FrontDeskManager {
    constructor(scene) {
        this.scene = scene;
        this.desks = new Map(); // sprite -> deskData
        this.deskDataById = new Map(); // id -> deskData (API数据)
        this.deskSpritesByName = new Map(); // name -> sprite (地图精灵)
    }

    /**
     * 初始化管理器 - 加载前台数据
     */
    async init() {
        // 从API加载前台数据配置
        await this.loadDeskData();
        console.log(`🏢 [FrontDeskManager] 初始化完成，加载了 ${this.deskDataById.size} 个前台配置`);
    }

    /**
     * 加载数据库中的所有活跃前台数据（仅数据，不创建精灵）
     */
    async loadDeskData() {
        try {
            const response = await fetch('/api/front-desk');
            const data = await response.json();
            const desks = data.data;

            if (data.success && Array.isArray(desks)) {
                desks.forEach(deskData => {
                    this.deskDataById.set(deskData.id, deskData);
                });
                console.log(`🏢 [FrontDeskManager] 加载了 ${desks.length} 个前台数据`);
            }
        } catch (error) {
            console.error('🏢 [FrontDeskManager] 加载前台数据失败:', error);
        }
    }

    /**
     * 注册地图创建的前台精灵
     * @param {Object} mapObj - Tiled地图对象
     * @param {Phaser.GameObjects.Sprite} sprite - 已创建的精灵
     */
    registerFrontDesk(mapObj, sprite) {
        if (!sprite) return;

        // 从地图对象名称匹配前台数据
        // 地图对象名称格式: "desk-big-manager-left-1", "desk-big-manager-center-1" 等
        // 我们需要根据位置匹配对应的前台数据
        const deskData = this.matchDeskData(mapObj);

        if (deskData) {
            // 为精灵添加前台信息
            sprite.deskId = deskData.id;
            sprite.deskName = deskData.name;
            sprite.serviceScope = deskData.serviceScope;
            sprite.greeting = deskData.greeting;
            sprite.workingHours = deskData.workingHours;

            // 🔧 关键修复：添加到 deskColliders group
            // staticGroup.add() 会自动为 sprite 添加静态物理体
            if (this.scene.deskColliders) {
                this.scene.deskColliders.add(sprite);
                console.log(`🏢 [FrontDesk] ${deskData.name} 已添加到 deskColliders group`);

                // 🔧 关键修复：确保物理体存在（staticGroup.add()应该会自动创建）
                // 设置碰撞边界（比精灵稍小，避免过于严格的碰撞）
                // 注意：必须在 add() 之后设置，因为 add() 会创建 body
                if (sprite.body) {
                    const bodyWidth = sprite.width * 0.6;
                    const bodyHeight = sprite.height * 0.6;
                    const offsetX = (sprite.width - bodyWidth) / 2;
                    const offsetY = (sprite.height - bodyHeight) / 2;

                    sprite.body.setSize(bodyWidth, bodyHeight);
                    sprite.body.setOffset(offsetX, offsetY);
                    console.log(`🏢 [FrontDesk] ${deskData.name} 碰撞体已设置: ${Math.round(bodyWidth)}x${Math.round(bodyHeight)}, 偏移: (${Math.round(offsetX)}, ${Math.round(offsetY)}), 原始大小: ${sprite.width}x${sprite.height}`);
                    console.log(`🏢 [FrontDesk] ${deskData.name} 物理体位置: (${Math.round(sprite.body.x)}, ${Math.round(sprite.body.y)})`);
                } else {
                    console.error(`❌❌❌ [FrontDesk] ${deskData.name} 添加到group后没有物理体！这不应该发生！`);
                    console.error(`❌ Sprite详情:`, {
                        x: sprite.x,
                        y: sprite.y,
                        width: sprite.width,
                        height: sprite.height,
                        texture: sprite.texture.key,
                        hasBody: !!sprite.body
                    });
                }
            } else {
                console.error(`❌ [FrontDesk] deskColliders group 不存在，无法添加碰撞`);
            }

            // 添加名字标签
            const nameText = this.scene.add.text(sprite.x, sprite.y - 40, deskData.name, {
                fontSize: '12px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 }
            });
            nameText.setOrigin(0.5, 0.5);
            nameText.setDepth(1000);

            // 添加服务范围标签
            const roleText = this.scene.add.text(sprite.x, sprite.y - 55, deskData.serviceScope, {
                fontSize: '10px',
                color: '#ffcc00',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 }
            });
            roleText.setOrigin(0.5, 0.5);
            roleText.setDepth(1000);

            // 绑定标签到精灵
            sprite.nameText = nameText;
            sprite.roleText = roleText;

            // 注册到管理器
            this.desks.set(sprite, deskData);
            this.deskSpritesByName.set(deskData.name, sprite);

            console.log(`🏢 [FrontDesk] 注册前台: ${deskData.name} (${deskData.serviceScope}) at (${sprite.x}, ${sprite.y})`);
        } else {
            console.warn(`🏢 [FrontDesk] 无法匹配前台数据: ${mapObj.name} at (${mapObj.x}, ${mapObj.y})`);
        }
    }

    /**
     * 根据地图对象匹配前台数据
     * 策略: 使用地图对象的位置，找到最近的**未使用**的前台数据
     */
    matchDeskData(mapObj) {
        if (this.deskDataById.size === 0) return null;

        // 获取已使用的前台配置ID
        const usedIds = new Set(Array.from(this.desks.values()).map(d => d.id));

        let closestDesk = null;
        let minDistance = Infinity;

        // 找到最近的**未使用**的前台数据配置
        this.deskDataById.forEach(deskData => {
            // 跳过已使用的配置
            if (usedIds.has(deskData.id)) {
                return;
            }

            const distance = Math.sqrt(
                Math.pow(mapObj.x - deskData.x, 2) +
                Math.pow(mapObj.y - deskData.y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestDesk = deskData;
            }
        });

        // 如果找不到未使用的配置，返回null（不再注册）
        if (!closestDesk) {
            return null;
        }

        // 如果距离超过200像素，也认为不匹配
        if (minDistance > 200) {
            console.warn(`🏢 [FrontDesk] 地图对象 ${mapObj.name} at (${mapObj.x}, ${mapObj.y}) 距离最近的未使用配置超过200像素，跳过`);
            return null;
        }

        return closestDesk;
    }

    /**
     * 更新所有前台的标签位置
     */
    update() {
        this.desks.forEach((deskData, sprite) => {
            if (sprite && sprite.active) {
                // 更新名字标签位置
                if (sprite.nameText) {
                    sprite.nameText.setPosition(sprite.x, sprite.y - 40);
                }
                // 更新角色标签位置
                if (sprite.roleText) {
                    sprite.roleText.setPosition(sprite.x, sprite.y - 55);
                }
            }
        });
    }

    /**
     * 获取玩家在碰撞范围内的所有前台
     */
    getCollidingDesks(player, distance = 80) {
        const collidingDesks = [];

        this.desks.forEach((deskData, sprite) => {
            if (sprite && sprite.active && sprite.body) {
                // 使用物理体边界进行更精确的碰撞检测
                const bounds = sprite.body;
                const dist = Phaser.Math.Distance.Between(
                    player.x, player.y,
                    sprite.x, sprite.y
                );

                if (dist < distance) {
                    collidingDesks.push({
                        sprite,
                        deskData,
                        distance: dist
                    });
                }
            }
        });

        return collidingDesks;
    }

    /**
     * 获取玩家附近的前台（用于交互提示）
     */
    getNearbyDesk(player, distance = 80) {
        let nearestSprite = null;
        let minDistance = distance;

        this.desks.forEach((deskData, sprite) => {
            if (sprite && sprite.active) {
                const dist = Phaser.Math.Distance.Between(
                    player.x, player.y,
                    sprite.x, sprite.y
                );

                if (dist < minDistance) {
                    minDistance = dist;
                    nearestSprite = sprite;
                }
            }
        });

        return nearestSprite;
    }

    /**
     * 清理资源
     */
    destroy() {
        this.desks.forEach((deskData, sprite) => {
            if (sprite.nameText) sprite.nameText.destroy();
            if (sprite.roleText) sprite.roleText.destroy();
        });
        this.desks.clear();
        this.deskDataById.clear();
        this.deskSpritesByName.clear();
    }
}
