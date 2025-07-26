import { WorkstationManager } from '../logic/WorkstationManager.js';
import { Player } from '../entities/Player.js';

export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        this.workstationManager = null;
        this.player = null;
        this.cursors = null;
        this.wasdKeys = null;
        this.deskColliders = null;
        
    }

    preload() {
        this.loadTilemap();
        this.loadTilesetImages();
        this.loadLibraryImages();
    }

    create() {
        // 初始化工位管理器
        this.workstationManager = new WorkstationManager(this);
        this.setupWorkstationEvents();

        const map = this.createTilemap();
        this.createTilesetLayers(map);
        this.renderObjectLayer(map, 'desk_objs');
        
        // 创建玩家
        this.createPlayer(map);
        
        // 设置输入
        this.setupInput();
        
        this.setupCamera(map);
        
        // 创建完成后的初始化
        this.time.delayedCall(100, () => {
            this.workstationManager.printStatistics();
            this.setupTestBindings(); // 示例绑定
        });
    }

    update() {
        this.handlePlayerMovement();
    }

    // ===== 玩家相关方法 =====
    createPlayer(map) {
        // 从对象层获取玩家位置
        const userLayer = map.getObjectLayer('player_objs');
        if (!userLayer) {
            console.warn('User objects layer not found');
            return;
        }

        // 找到玩家身体和头部对象
        const userBody = userLayer.objects.find(obj => obj.name === 'user_body');
        const userHead = userLayer.objects.find(obj => obj.name === 'user_head');

        if (!userBody || !userHead) {
            console.warn('Player objects not found');
            return;
        }

        // 创建玩家实例
        this.player = new Player(this, userBody.x, userBody.y - userBody.height);
        this.add.existing(this.player);
        
        console.log('Player created at:', this.player.x, this.player.y);
    }

    handlePlayerMovement() {
        if (!this.player || !this.player.body) return;

        const speed = 200;
        let velocityX = 0;
        let velocityY = 0;
        let direction = this.player.currentDirection; // 保持当前方向

        // 检查水平移动
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
            velocityX = -speed;
            direction = 'left';
        } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
            velocityX = speed;
            direction = 'right';
        }

        // 检查垂直移动
        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
            velocityY = -speed;
            direction = 'up';
        } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
            velocityY = speed;
            direction = 'down';
        }

        // 设置速度和方向
        this.player.move(velocityX, velocityY, direction);
    }

    // ===== 工位事件处理 =====
    setupWorkstationEvents() {
        // 监听工位相关事件
        this.events.on('workstation-clicked', (data) => {
            console.log('Workstation clicked event:', data);
            // 在这里添加自定义的点击处理逻辑
        });

        this.events.on('user-bound', (data) => {
            console.log('User bound event:', data);
            // 在这里添加用户绑定后的处理逻辑
        });

        this.events.on('user-unbound', (data) => {
            console.log('User unbound event:', data);
            // 在这里添加用户解绑后的处理逻辑
        });
    }

    // ===== 资源加载方法 =====
    loadTilemap() {
        this.load.tilemapTiledJSON('officemap', 'assets/officemap.json');
    }

    loadTilesetImages() {
        const tilesetAssets = {
            'room_builder_walls_image': 'assets/floor/Room_Builder_Walls_48x48.png',
            'ice_creem_floor_image': 'assets/floor/Ice_Cream_Shop_Design_layer_1_48x48.png',
        };

        Object.entries(tilesetAssets).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        const spriteAssets = {
            'characters_list_image': 'assets/player/me.png'
        }

        Object.entries(spriteAssets).forEach(([key, path]) => {
            this.load.spritesheet(key, path, { frameWidth: 48, frameHeight: 48 });
        });
    }

    loadLibraryImages() {
        // 默认桌子图像
        this.load.image("desk_image", "assets/desk/desk_long_right.png");
        this.load.image("desk_long_right", "assets/desk/desk_long_right.png");
        this.load.image("desk_long_left", "assets/desk/desk_long_left.png");
        this.load.image("desk_short_right", "assets/desk/desk_short_right.png");
        this.load.image("desk_short_left", "assets/desk/desk_short_left.png");
    }

    // ===== 地图创建方法 =====
    createTilemap() {
        return this.make.tilemap({ key: 'officemap', tileWidth: 48, tileHeight: 48 });
    }

    createTilesetLayers(map) {
        // 添加 tileset
        const tilesets = this.addTilesets(map);
        
        // 创建图层
        const layerNames = ['bg', 'office_1', 'office_1_desk'];
        layerNames.forEach(layerName => {
            map.createLayer(layerName, tilesets);
        });
    }

    addTilesets(map) {
        const tilesetConfigs = [
            ['room_floor_tileset', 'room_builder_walls_image'],
            ['ice_creem_floor', 'ice_creem_floor_image'],
            ['characters_list', 'characters_list_image'],
        ];

        return tilesetConfigs.map(([tilesetName, imageKey]) => 
            map.addTilesetImage(tilesetName, imageKey)
        );
    }

    // ===== 对象渲染方法 =====
    renderObjectLayer(map, layerName) {
        const objectLayer = map.getObjectLayer(layerName);
        
        if (!objectLayer) {
            console.warn(`Object layer "${layerName}" not found`);
            return;
        }

        console.log(`Found ${layerName} with ${objectLayer.objects.length} objects`, objectLayer);
        
        // 创建桌子碰撞组
        this.deskColliders = this.physics.add.staticGroup();
        
        objectLayer.objects.forEach((obj, index) => this.renderObject(obj, index));
    }

    renderObject(obj, index) {
        console.log(`Object ${index}:`, obj.properties);
        
        const adjustedY = obj.y - obj.height;
        let sprite = null;
        
        // 渲染对象
        if (obj.gid) {
            sprite = this.renderTilesetObject(obj, adjustedY);
        } else if (this.isDeskObject(obj)) {
            sprite = this.renderGeometricObject(obj, adjustedY);
        }
        
        // 如果是工位对象，使用工位管理器创建工位
        if (sprite && this.isDeskObject(obj)) {
            this.workstationManager.createWorkstation(obj, sprite);
            
            // 为桌子添加物理碰撞
            this.addDeskCollision(sprite, obj);
        }
        
        // 添加调试边界
        this.addDebugBounds(obj, adjustedY);
    }

    addDeskCollision(sprite, obj) {
        // 启用sprite的物理特性
        this.physics.world.enable(sprite);
        sprite.body.setImmovable(true);
        
        // 添加到碰撞组
        this.deskColliders.add(sprite);
        
        // 设置玩家与桌子的碰撞
        if (this.player) {
            this.physics.add.collider(this.player, sprite);
        } else {
            // 如果玩家还未创建，稍后再设置碰撞
            this.time.delayedCall(200, () => {
                if (this.player) {
                    this.physics.add.collider(this.player, sprite);
                }
            });
        }
    }

    renderTilesetObject(obj, adjustedY) {
        const imageKey = obj.name || 'desk_image';
        if (!imageKey) return null;

        console.log(`Rendering tileset object: `, obj);
        
        const sprite = this.add.image(obj.x, adjustedY, imageKey);
        this.configureSprite(sprite, obj);
        return sprite;
    }

    renderGeometricObject(obj, adjustedY) {
        console.log(`Rendering geometric object at (${obj.x}, ${adjustedY})`);
        
        const sprite = this.add.image(obj.x, adjustedY, 'desk_image');
        this.configureSprite(sprite, obj);
        return sprite;
    }

    configureSprite(sprite, obj) {
        sprite.setOrigin(0, 0);
        if (obj.width && obj.height) {
            sprite.setDisplaySize(obj.width, obj.height);
        }
    }

    // ===== 辅助方法 =====
    isDeskObject(obj) {
        return obj.name === 'desk' || obj.type === 'desk';
    }

    addDebugBounds(obj, adjustedY) {
        const debugRect = this.add.rectangle(
            obj.x, adjustedY, 
            obj.width || 48, obj.height || 48, 
            0xff0000, 0.2
        );
        debugRect.setOrigin(0, 0);
        debugRect.setStrokeStyle(1, 0xff0000);
    }

    setupCamera(map) {
        // For infinite maps, we need to calculate the bounds based on the layer data
        const officeLayerData = map.getLayer('office_1');
        if (officeLayerData) {
            const mapWidth = officeLayerData.width * map.tileWidth;
            const mapHeight = officeLayerData.height * map.tileHeight;
            // Tiled JSON for infinite maps provides startx/starty in tiles, not pixels
            const mapX = officeLayerData.startx * map.tileWidth;
            const mapY = officeLayerData.starty * map.tileHeight;

            this.cameras.main.setBounds(mapX, mapY, mapWidth, mapHeight);
            this.physics.world.setBounds(mapX, mapY, mapWidth, mapHeight);
            console.log(`Map bounds set to: x:${mapX}, y:${mapY}, w:${mapWidth}, h:${mapHeight}`);
        } else {
            // Fallback for non-infinite maps or if layer name changes
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            console.log(`Map size (fallback): ${map.widthInPixels}x${map.heightInPixels}`);
        }
        
        // 让摄像机跟随玩家
        if (this.player) {
            this.cameras.main.startFollow(this.player);
            this.cameras.main.setLerp(0.1, 0.1); // 平滑跟随
        }
    }

    // ===== 输入设置方法 =====
    setupInput() {
        // 键盘输入
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // WASD 键盘输入
        this.wasdKeys = this.input.keyboard.addKeys({
            'W': Phaser.Input.Keyboard.KeyCodes.W,
            'A': Phaser.Input.Keyboard.KeyCodes.A,
            'S': Phaser.Input.Keyboard.KeyCodes.S,
            'D': Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    // ===== 工位管理便捷方法 =====
    // 这些方法提供对工位管理器的便捷访问
    bindUser(workstationId, userId, userInfo) {
        return this.workstationManager.bindUserToWorkstation(workstationId, userId, userInfo);
    }

    unbindUser(workstationId) {
        return this.workstationManager.unbindUserFromWorkstation(workstationId);
    }

    getWorkstation(workstationId) {
        return this.workstationManager.getWorkstation(workstationId);
    }

    getAvailableWorkstations() {
        return this.workstationManager.getAvailableWorkstations();
    }

    // ===== 示例和测试方法 =====
    setupTestBindings() {
        console.log('=== Setting up test bindings ===');
        
        // 获取前几个工位进行测试绑定
        const availableWorkstations = this.workstationManager.getAvailableWorkstations().slice(0, 3);
        
        availableWorkstations.forEach((workstation, index) => {
            const userId = `user_${index + 1}`;
            const userInfo = {
                name: `User ${index + 1}`,
                department: 'Engineering',
                role: 'Developer'
            };
            this.workstationManager.bindUserToWorkstation(workstation.id, userId, userInfo);
        });
        
        console.log('=== Test bindings complete ===');
        this.workstationManager.printStatistics();
    }

    // ===== 清理方法 =====
    shutdown() {
        if (this.workstationManager) {
            this.workstationManager.destroy();
        }
        super.shutdown();
    }

}