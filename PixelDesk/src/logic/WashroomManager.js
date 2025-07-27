export class WashroomManager {
    constructor(scene) {
        this.scene = scene;
        this.washroomWallLayer = null;
        this.washroomFloorLayer = null;
        this.washroomObjects = null;
        this.washroomColliders = null;
    }

    createWashroom(map) {
        // 创建洗手间地板层
        this.washroomFloorLayer = map.createLayer('washroom/washroom_floor', this.scene.addTilesets(map));
        
        // 创建洗手间墙层
        this.washroomWallLayer = map.createLayer('washroom/washroom_wall', this.scene.addTilesets(map));
        
        // 为洗手间墙添加碰撞
        if (this.washroomWallLayer) {
            this.washroomWallLayer.setCollisionByProperty({ solid: true });
            
            // 添加玩家与洗手间墙的碰撞
            if (this.scene.player) {
                this.scene.physics.add.collider(this.scene.player, this.washroomWallLayer);
            }
        }
        
        // 渲染洗手间对象层
        this.renderWashroomObjects(map);
    }
    
    renderWashroomObjects(map) {
        const objectLayer = map.getObjectLayer('washroom/washroom_objs');
        
        if (!objectLayer) {
            console.warn('Washroom object layer not found');
            return;
        }

        console.log(`Found washroom with ${objectLayer.objects.length} objects`, objectLayer);
        
        // 创建洗手间对象碰撞组
        this.washroomColliders = this.scene.physics.add.staticGroup();
        
        // 为具有solid属性的对象设置碰撞
        objectLayer.objects.forEach(obj => {
            if (obj.properties && obj.properties.some(prop => prop.name === 'solid' && prop.value === true)) {
                // 启用图层碰撞
                map.setCollisionBetween(obj.gid, obj.gid, true, this.washroomFloorLayer, true);
            }
        });
        
        objectLayer.objects.forEach((obj, index) => this.renderWashroomObject(obj, index));
    }
    
    renderWashroomObject(obj, index) {
        console.log(`Washroom object ${index}:`, obj.properties);
        
        const adjustedY = obj.y - obj.height;
        let sprite = null;
        
        // 渲染对象
        if (obj.gid) {
            sprite = this.renderTilesetObject(obj, adjustedY);
        } else {
            sprite = this.renderGeometricObject(obj, adjustedY);
        }
        
        // 为洗手间对象添加物理碰撞
        if (sprite) {
            this.addWashroomCollision(sprite, obj);
        }
    }
    
    renderTilesetObject(obj, adjustedY) {
        const imageKey = obj.name || 'Shadowless';
        if (!imageKey) return null;

        console.log(`Rendering washroom tileset object: `, obj);
        
        const sprite = this.scene.add.image(obj.x, adjustedY, imageKey);
        this.configureSprite(sprite, obj);
        return sprite;
    }

    renderGeometricObject(obj, adjustedY) {
        console.log(`Rendering washroom geometric object at (${obj.x}, ${adjustedY})`);
        
        const sprite = this.scene.add.image(obj.x, adjustedY, 'Shadowless');
        this.configureSprite(sprite, obj);
        return sprite;
    }
    
    configureSprite(sprite, obj) {
        sprite.setOrigin(0, 0);
        if (obj.width && obj.height) {
            sprite.setDisplaySize(obj.width, obj.height);
        }
        // 应用对象的旋转角度（如果存在）
        if (obj.rotation !== undefined) {
            // Tiled使用角度，Phaser使用弧度，需要转换
            const rotationRad = obj.rotation * Math.PI / 180;
            sprite.setRotation(rotationRad);
            
            // 调整旋转后的坐标偏移
            // Tiled以对象中心为旋转中心，Phaser以左上角为旋转中心
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y - obj.height / 2;
            
            // 计算旋转后的新位置
            const rotatedX = centerX - (obj.width / 2) * Math.cos(rotationRad) - (obj.height / 2) * Math.sin(rotationRad);
            const rotatedY = centerY + (obj.width / 2) * Math.sin(rotationRad) - (obj.height / 2) * Math.cos(rotationRad);
            
            sprite.setX(rotatedX);
            sprite.setY(rotatedY);
        }
    }
    
    addWashroomCollision(sprite, obj) {
        // 检查对象是否具有solid属性且值为true
        const isSolid = obj.properties && obj.properties.some(prop => prop.name === 'solid' && prop.value === true);
        
        if (isSolid) {
            // 启用sprite的物理特性
            this.scene.physics.world.enable(sprite);
            sprite.body.setImmovable(true);
            
            // 添加到碰撞组
            this.washroomColliders.add(sprite);
            
            // 设置玩家与洗手间对象的碰撞
            if (this.scene.player) {
                this.scene.physics.add.collider(this.scene.player, sprite);
            } else {
                // 如果玩家还未创建，稍后再设置碰撞
                this.scene.time.delayedCall(200, () => {
                    if (this.scene.player) {
                        this.scene.physics.add.collider(this.scene.player, sprite);
                    }
                });
            }
        }
    }
}