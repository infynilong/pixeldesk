import { WorkstationManager } from '../logic/WorkstationManager.js';
import { Player } from '../entities/Player.js';
import { WashroomManager } from '../logic/WashroomManager.js';
import { ZoomControl } from '../components/ZoomControl.js';

export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        this.workstationManager = null;
        this.washroomManager = null; // 添加洗手间管理器
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
        // 初始化洗手间管理器
        this.washroomManager = new WashroomManager(this);
        this.setupWorkstationEvents();

        const map = this.createTilemap();
        this.mapLayers = this.createTilesetLayers(map);
        this.renderObjectLayer(map, 'desk_objs');
        
        // 创建洗手间
        this.washroomManager.createWashroom(map);
        this.renderObjectLayer(map, 'washroom/washroom_objs');

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

        // 创建玩家实例（位置会从保存状态中恢复）
        this.player = new Player(this, userBody.x, userBody.y - userBody.height);
        this.add.existing(this.player);
        
        // 确保在玩家创建后设置与地图图层的碰撞
        this.time.delayedCall(100, () => {
            const officeLayer = this.mapLayers?.office_1;
            if (officeLayer) {
                this.physics.add.collider(this.player, officeLayer);
                officeLayer?.setCollisionByProperty({ solid: true });
            }
            
            // 添加玩家碰撞边界调试显示
            if (this.player.body) {
                const debugGraphics = this.add.graphics();
                debugGraphics.lineStyle(2, 0x00ff00, 1);
                debugGraphics.strokeRect(
                    this.player.body.x, 
                    this.player.body.y, 
                    this.player.body.width, 
                    this.player.body.height
                );
                console.log('Player collision bounds:', {
                    x: this.player.body.x,
                    y: this.player.body.y,
                    width: this.player.body.width,
                    height: this.player.body.height
                });
            }
        });
        
        console.log('Player created at:', this.player.x, this.player.y);
    }

    // 简化玩家移动处理逻辑
    handlePlayerMovement() {
        if (!this.player || !this.player.body) return;
        
        // 将移动处理委托给Player类
        this.player.handleMovement(this.cursors, this.wasdKeys);
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
        this.load.image("desk_short_right", "assets/desk/single_desk.png");
        this.load.image("desk_short_left", "assets/desk/single_desk_short_left.png");
        this.load.image("single_desk", "assets/desk/single_desk.png");
        this.load.image("library_bookcase_normal", "assets/desk/library_bookcase_normal.png");
        this.load.image("library_bookcase_tall", "assets/desk/library_bookcase_tall.png");

        this.load.image("Shadowless_washhand", "assets/bathroom/Shadowless_washhand.png");
        this.load.image("Bathroom_matong", "assets/bathroom/Bathroom_matong.png");
        this.load.image("Shadowless_glass_2", "assets/bathroom/Shadowless_glass_2.png");
        this.load.image("Shadowless_glass", "assets/bathroom/Shadowless_glass.png");
    }

    // ===== 地图创建方法 =====
    createTilemap() {
        return this.make.tilemap({ key: 'officemap', tileWidth: 48, tileHeight: 48 });
    }

    createTilesetLayers(map) {
        // 添加 tileset
        const tilesets = this.addTilesets(map);
        
        // 创建图层
        const layerNames = ['bg', 'office_1'];
        const layers = {};
        
        layerNames.forEach(layerName => {
            layers[layerName] = map.createLayer(layerName, tilesets);
        });
        
        // 为office_1图层添加碰撞效果
        if (layers.office_1) {
            // 如果玩家已创建，设置玩家与该图层的碰撞
            if (this.player) {
                this.physics.add.collider(this.player, layers.office_1);
            }
        }
        
        return layers;
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
        // this.addDebugBounds(obj, adjustedY);
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

    // ===== 辅助方法 =====
    isDeskObject(obj) {
        // 修改为同时识别desk和bookcase对象
        return obj.name === 'desk' || obj.type === 'desk' || 
               obj.name === 'library_bookcase_normal' || obj.name === 'library_bookcase_tall' ||
               obj.type === 'bookcase';
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
        
        // 从本地存储获取缩放值，如果没有则使用默认值0.5
        const savedZoom = localStorage.getItem('cameraZoom');
        const zoomValue = savedZoom ? parseFloat(savedZoom) : 0.5;
        
        // 设置相机缩放
        this.cameras.main.setZoom(zoomValue);
        
        // 让摄像机跟随玩家
        if (this.player) {
            this.cameras.main.startFollow(this.player);
            this.cameras.main.setLerp(0.1, 0.1); // 平滑跟随
        }
        
        // 创建缩放控制按钮
        this.createZoomControls();
    }

    createZoomControls() {
        // 使用新创建的ZoomControl组件
        this.zoomControl = new ZoomControl(this);
    }
    
    adjustZoom(delta) {
        // 获取当前缩放值
        let currentZoom = this.cameras.main.zoom;
        // 计算新缩放值
        let newZoom = currentZoom + delta;
        
        // 限制缩放范围在0.2到2之间
        newZoom = Phaser.Math.Clamp(newZoom, 0.2, 2);
        
        // 使用动画效果调整缩放
        this.tweens.add({
            targets: this.cameras.main,
            zoom: newZoom,
            duration: 300,
            ease: 'Sine.easeInOut'
        });
        
        // 保存到本地存储
        localStorage.setItem('cameraZoom', newZoom.toString());
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
        const availableWorkstations = this.workstationManager.getAvailableWorkstations().slice(0, 10);
        
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