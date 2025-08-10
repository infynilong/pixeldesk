import { WorkstationManager } from '../logic/WorkstationManager.js';
import { Player } from '../entities/Player.js';
import { WashroomManager } from '../logic/WashroomManager.js';
import { ZoomControl } from '../components/ZoomControl.js';
import { WorkstationBindingUI } from '../components/WorkstationBindingUI.js';

export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
        this.workstationManager = null;
        this.washroomManager = null; // 添加洗手间管理器
        this.player = null;
        this.cursors = null;
        this.wasdKeys = null;
        this.deskColliders = null;
        this.currentUser = null;
        this.bindingUI = null;
        this.otherPlayers = new Map(); // 存储其他玩家
        this.myStatus = null; // 我的状态
    }

    preload() {
        this.loadTilemap();
        this.loadTilesetImages();
        this.loadLibraryImages();
    }

    create() {
        this.scene.launch('TextUIScene');
        this.scene.bringToTop('TextUIScene');

        // 保存场景引用到全局变量，供Next.js调用
        if (typeof window !== 'undefined') {
            window.saveGameScene(this);
        }

        // 获取用户数据（从场景参数或本地存储）
        const sceneData = this.scene.settings.data || {};
        this.currentUser = sceneData.userData || this.getCurrentUserFromStorage();
        
        if (!this.currentUser) {
            // 如果没有用户数据，跳转到注册场景
            this.scene.start('RegisterScene');
            return;
        }
        
        // 确保积分字段一致性 - 如果有gold字段但没有points字段，进行同步
        if (this.currentUser.gold !== undefined && this.currentUser.points === undefined) {
            this.currentUser.points = this.currentUser.gold;
            console.log('同步积分字段：gold -> points, 积分值:', this.currentUser.points);
        } else if (this.currentUser.points !== undefined && this.currentUser.gold === undefined) {
            this.currentUser.gold = this.currentUser.points;
            console.log('同步积分字段：points -> gold, 积分值:', this.currentUser.gold);
        }

        // 游戏逻辑
        this.userData = {
            username: this.currentUser.username,
            level: 1,
            hp: 80,
            maxHp: 100,
            gold: 150,
            deskCount: 1000,
        };
        
        // 初始化工位管理器
        this.workstationManager = new WorkstationManager(this);
        // 初始化洗手间管理器
        this.washroomManager = new WashroomManager(this);
        // 初始化工位绑定UI
        this.bindingUI = new WorkstationBindingUI(this);
        
        this.setupWorkstationEvents();
        this.setupUserEvents();

        const map = this.createTilemap();
        this.mapLayers = this.createTilesetLayers(map);
        this.renderObjectLayer(map, 'desk_objs');
        
        // 创建洗手间
        this.washroomManager.createWashroom(map);
        this.renderObjectLayer(map, 'washroom/washroom_objs');

        // 创建floor图层
         this.renderObjectLayer(map, 'floor');

        // 创建玩家
        this.createPlayer(map);
        
        // 设置输入
        this.setupInput();
        
        // 设置相机
        this.setupCamera(map);
        
        // 设置社交功能
        this.setupSocialFeatures();
        
        // 创建完成后的初始化
        this.time.delayedCall(100, () => {
            // 清理所有现有绑定和星星标记
            this.workstationManager.clearAllBindings();
            this.workstationManager.printStatistics();
            
            // 加载保存的工位绑定信息
            this.workstationManager.loadSavedBindings();
            
            // 高亮当前用户的工位
            if (this.currentUser) {
                this.workstationManager.highlightUserWorkstation(this.currentUser.id);
            }
            
            // 为其他用户的工位放置角色（跳过当前用户的工位）
            this.placeCharactersAtOccupiedWorkstations();
            
            // 重新启用自动绑定，显示随机其他玩家
            this.setupTestBindings(); // 示例绑定
            this.checkExpiredWorkstations(); // 检查过期工位
            
            // 更新UI显示用户数据（积分和工位绑定状态）
            this.sendUserDataToUI();
            
            // 确保玩家移动是启用的
            console.log('Start.js: 游戏初始化 - 检查玩家移动状态，player对象:', !!this.player);
            console.log('Start.js: 游戏初始化 - enableMovement属性值:', this.player?.enableMovement);
            console.log('Start.js: 游戏初始化 - enableMovement方法类型:', typeof this.player?.enableMovement);
            if (this.player && !this.player.enableMovement) {
                this.player.enableMovement = true;
                console.log('Start.js: 游戏初始化完成，设置enableMovement属性为true');
            } else if (this.player && typeof this.player.enableMovement === 'function') {
                this.player.enableMovement();
                console.log('Start.js: 游戏初始化完成，调用enableMovement()方法');
            }
        });

        // 发送用户数据到UI
        this.sendUserDataToUI();
    }

    update() {
        this.handlePlayerMovement();
        
        // 更新绑定UI
        if (this.bindingUI) {
            this.bindingUI.update();
        }
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

        // 创建玩家实例（位置会从保存状态中恢复），启用移动和状态保存
        const playerSpriteKey = this.currentUser?.character || 'characters_list_image';
        this.player = new Player(this, userBody.x, userBody.y - userBody.height, playerSpriteKey, true, true);
        this.add.existing(this.player);
        
        // 确保玩家移动是启用的
        this.time.delayedCall(50, () => {
            console.log('Start.js: 玩家创建后 - 尝试恢复玩家移动，player对象:', !!this.player);
            console.log('Start.js: 玩家创建后 - enableMovement方法类型:', typeof this.player?.enableMovement);
            if (this.player && typeof this.player.enableMovement === 'function') {
                this.player.enableMovement();
                console.log('Start.js: 玩家创建完成，移动已启用');
            } else {
                console.error('Start.js: 玩家创建后 - 无法恢复玩家移动 - player对象或enableMovement方法不存在');
            }
        });
        
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
                // console.log('Player collision bounds:', {
                //     x: this.player.body.x,
                //     y: this.player.body.y,
                //     width: this.player.body.width,
                //     height: this.player.body.height
                // });
            }
        });
        
        // console.log('Player created at:', this.player.x, this.player.y);
    }

    // 简化玩家移动处理逻辑
    handlePlayerMovement() {
        if (!this.player || !this.player.body) return;
        
        // 将移动处理委托给Player类
        this.player.handleMovement(this.cursors, this.wasdKeys);
    }

    // ===== 工位事件处理 =====
    setupWorkstationEvents() {
        // 监听工位绑定请求事件
        this.events.on('workstation-binding-request', (data) => {
            console.log('Workstation binding request:', data);
            this.showWorkstationBindingPrompt(data.workstation);
        });

        // 监听工位相关事件
        this.events.on('workstation-clicked', (data) => {
            // console.log('Workstation clicked event:', data);
            // 在这里添加自定义的点击处理逻辑
        });

        this.events.on('user-bound', (data) => {
            // console.log('User bound event:', data);
            // 在这里添加用户绑定后的处理逻辑
        });

        this.events.on('user-unbound', (data) => {
            // console.log('User unbound event:', data);
            // 在这里添加用户解绑后的处理逻辑
            if (this.currentUser && this.currentUser.id === data.userId) {
                // 更新用户的工位列表
                if (this.currentUser.workstations) {
                    this.currentUser.workstations = this.currentUser.workstations.filter(
                        ws => ws.id !== data.workstationId
                    );
                }
                this.saveCurrentUser();
                
                // 更新UI显示工位ID
                this.sendUserDataToUI();
            }
        });
    }

    // ===== 资源加载方法 =====
    loadTilemap() {
        this.load.tilemapTiledJSON('officemap', '/assets/officemap.json');
    }

    loadTilesetImages() {
        const tilesetAssets = {
            'room_builder_walls_image': '/assets/floor/Room_Builder_Walls_48x48.png',
            'ice_creem_floor_image': '/assets/floor/Ice_Cream_Shop_Design_layer_1_48x48.png',
        };

        Object.entries(tilesetAssets).forEach(([key, path]) => {
            this.load.image(key, path);
        });

        const spriteAssets = {
            'characters_list_image': '/assets/player/me.png'
        }

        Object.entries(spriteAssets).forEach(([key, path]) => {
            this.load.spritesheet(key, path, { frameWidth: 48, frameHeight: 48 });
        });

         // 加载角色图片（每个都包含4个方向的帧）
        const characterAssets = [
            'Premade_Character_48x48_01.png',
            'Premade_Character_48x48_02.png',
            'Premade_Character_48x48_03.png',
            'Premade_Character_48x48_04.png',
            'Premade_Character_48x48_05.png',
            'Premade_Character_48x48_06.png',
            'Premade_Character_48x48_07.png',
            'Premade_Character_48x48_08.png',
            'Premade_Character_48x48_09.png',
            'Premade_Character_48x48_10.png',
            'Premade_Character_48x48_11.png',
            'Premade_Character_48x48_12.png',
            'Premade_Character_48x48_13.png',
            'Premade_Character_48x48_14.png',
            'Premade_Character_48x48_15.png',
            'Premade_Character_48x48_16.png',
            'Premade_Character_48x48_17.png',
            'Premade_Character_48x48_18.png',
            'Premade_Character_48x48_19.png',
            'Premade_Character_48x48_20.png',
        ];

        characterAssets.forEach(filename => {
            const key = filename.replace('.png', '');
            this.load.spritesheet(key, `/assets/characters/${filename}`, { frameWidth: 48, frameHeight: 48 });
        });
    }

    loadLibraryImages() {
        // 默认桌子图像
        this.load.image("desk_image", "/assets/desk/desk_long_right.png");
        this.load.image("desk_long_right", "/assets/desk/desk_long_right.png");
        this.load.image("desk_long_left", "/assets/desk/desk_long_left.png");
        this.load.image("desk_short_right", "/assets/desk/single_desk.png");
        this.load.image("desk_short_left", "/assets/desk/single_desk_short_left.png");
        this.load.image("single_desk", "/assets/desk/single_desk.png");
        this.load.image("library_bookcase_normal", "/assets/desk/library_bookcase_normal.png");
        this.load.image("library_bookcase_tall", "/assets/desk/library_bookcase_tall.png");

        this.load.image("Shadowless_washhand", "/assets/bathroom/Shadowless_washhand.png");
        this.load.image("Bathroom_matong", "/assets/bathroom/Bathroom_matong.png");
        this.load.image("Shadowless_glass_2", "/assets/bathroom/Shadowless_glass_2.webp");
        this.load.image("Shadowless_glass", "/assets/bathroom/Shadowless_glass.png");

        this.load.image("sofa-left-1", "/assets/sofa/sofa-left-1.png");
        this.load.image("sofa-left-2", "/assets/sofa/sofa-left-2.png");
        this.load.image("sofa-left-3", "/assets/sofa/sofa-left-3.png");
        this.load.image("sofa-right-1", "/assets/sofa/sofa-right-1.png");
        this.load.image("sofa-right-2", "/assets/sofa/sofa-right-2.png");
        this.load.image("sofa-right-3", "/assets/sofa/sofa-right-3.png");
        
        this.load.image("desk-big-manager-left-1", "/assets/desk/desk-big-manager-left-1.png");
        this.load.image("desk-big-manager-center-1", "/assets/desk/desk-big-manager-center-1.png");
        this.load.image("desk-big-manager-right-1", "/assets/desk/desk-big-manager-right-1.png");
        this.load.image("desk-big-manager-center-2", "/assets/desk/desk-big-manager-center-2.png");

        this.load.image("flower", "/assets/tileset/flower.png");
        this.load.image("rug", "/assets/tileset/rug.png");
        this.load.image("cabinet", "/assets/tileset/cabinet.png");
        this.load.image("stair-red", "/assets/tileset/stair-red.png");
    }

    // ===== 地图创建方法 =====
    createTilemap() {
        return this.make.tilemap({ key: 'officemap', tileWidth: 48, tileHeight: 48 });
    }

    createTilesetLayers(map) {
        // 添加 tileset
        const tilesets = this.addTilesets(map);
        
        // 创建图层
        const layerNames = ['office_1'];
        const layers = {};
        
        layerNames.forEach(layerName => {
            layers[layerName] = map.createLayer(layerName, tilesets);
        });
        
        // 启用渲染优化 - 只渲染屏幕附近的瓦片
        if (layers.office_1) {
            // 修改渲染填充为1，减少不必要的渲染
            layers.office_1.setCullPadding(1, 1);

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

        const addedTilesets = [];
        tilesetConfigs.forEach(([tilesetName, imageKey]) => {
            // 尝试不使用imageKey，让Phaser使用tilemap中的原始路径
            const tileset = map.addTilesetImage(tilesetName);
            if (tileset) {
                addedTilesets.push(tileset);
            } else {
                // 如果失败，尝试使用imageKey
                const tilesetWithKey = map.addTilesetImage(tilesetName, imageKey);
                if (tilesetWithKey) {
                    addedTilesets.push(tilesetWithKey);
                }
            }
        });

        return addedTilesets;
    }

    // ===== 对象渲染方法 =====
    renderObjectLayer(map, layerName) {
        const objectLayer = map.getObjectLayer(layerName);
        
        if (!objectLayer) {
            console.warn(`Object layer "${layerName}" not found`);
            return;
        }
        
        // 发送初始数据到UI - 只对desk_objs图层执行
        this.userData.deskCount = this.workstationManager.getWorkstationsByType('desk').length; 
       
        // 创建桌子碰撞组
        this.deskColliders = this.physics.add.staticGroup();
        
        objectLayer.objects.forEach((obj, index) => this.renderObject(obj, index));
    }

    renderObject(obj, index) {  
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
        
        // 添加调试边界（已注释）
        this.addDebugBounds(obj, adjustedY);
    }

    addDeskCollision(sprite, obj) {
        // 启用sprite的物理特性
        this.physics.world.enable(sprite);
        sprite.body.setImmovable(true);
        
        // 根据桌子类型调整碰撞边界
        const collisionSettings = this.getCollisionSettings(obj);
        const originalWidth = sprite.body.width;
        const originalHeight = sprite.body.height;
        
        // 计算新的碰撞边界大小
        const newWidth = originalWidth * collisionSettings.scaleX;
        const newHeight = originalHeight * collisionSettings.scaleY;
        
        // 设置碰撞边界大小（居中）
        sprite.body.setSize(newWidth, newHeight, true);
        
        // 如果需要偏移碰撞边界
        if (collisionSettings.offsetX !== 0 || collisionSettings.offsetY !== 0) {
            sprite.body.setOffset(collisionSettings.offsetX, collisionSettings.offsetY);
        }
        
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
    
    getCollisionSettings(obj) {
        const objName = obj.name || '';
        const objType = obj.type || '';
        
        // 根据不同的桌子类型返回不同的碰撞设置
        if (objName.includes('long') || objType.includes('long')) {
            // 长桌子 - 更小的碰撞边界
            return { scaleX: 0.4, scaleY: 0.4, offsetX: 0, offsetY: 0 };
        } else if (objName.includes('single') || objType.includes('single')) {
            // 单人桌 - 中等碰撞边界
            return { scaleX: 0.6, scaleY: 0.6, offsetX: 0, offsetY: 0 };
        } else if (objName.includes('bookcase') || objType.includes('bookcase')) {
            // 书架 - 更大的碰撞边界
            return { scaleX: 0.7, scaleY: 0.7, offsetX: 0, offsetY: 0 };
        } else if (objName.includes('sofa') || objType.includes('sofa')) {
            // 沙发 - 特殊的碰撞边界
            return { scaleX: 0.5, scaleY: 0.3, offsetX: 0, offsetY: 0 };
        } else {
            // 默认设置
            return { scaleX: 0.5, scaleY: 0.5, offsetX: 0, offsetY: 0 };
        }
    }

    renderTilesetObject(obj, adjustedY) {
        const imageKey = obj.name || 'desk_image';
        if (!imageKey) return null;
 
        const sprite = this.add.image(obj.x, adjustedY, imageKey);
        this.configureSprite(sprite, obj);
        return sprite;
    }

    renderGeometricObject(obj, adjustedY) {
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
               obj.type === 'bookcase' || obj.type === 'bookcase_tall' || obj.type === 'sofa' || obj.type === 'flower';
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
        } else {
            // Fallback for non-infinite maps or if layer name changes
            this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        }
        
        // 启用相机渲染优化 - 限制渲染范围
        this.cameras.main.useBounds = true;
        
        // 从本地存储获取缩放值，如果没有则使用默认值1（而不是0.5）
        const savedZoom = localStorage.getItem('cameraZoom');
        const zoomValue = savedZoom ? parseFloat(savedZoom) : 1;
        
        // 设置相机缩放
        this.cameras.main.setZoom(zoomValue);
        
        // 设置相机跟随和死区
        this.setupCameraFollow();
        
        // 创建缩放控制按钮
        this.createZoomControls();
    }

    // 设置相机跟随和死区
    setupCameraFollow() {
        if (this.player) {
            this.cameras.main.startFollow(this.player);
            // 设置较小的lerp值，使相机跟随更平滑
            this.cameras.main.setLerp(0.05, 0.05);
            // 设置死区，允许玩家在屏幕内移动
            this.updateDeadzone();
        } else {
            // 如果玩家尚未创建，延迟设置相机跟随
            this.time.delayedCall(100, () => {
                if (this.player) {
                    this.cameras.main.startFollow(this.player);
                    // 设置较小的lerp值，使相机跟随更平滑
                    this.cameras.main.setLerp(0.05, 0.05);
                    // 设置死区
                    this.updateDeadzone();
                }
            });
        }
    }

    createDeadzoneDebug(deadzoneWidth, deadzoneHeight) {
        // 创建一个图形对象来可视化死区
        if (this.deadzoneDebug) {
            this.deadzoneDebug.destroy();
        }
        
        this.deadzoneDebug = this.add.graphics();
        this.deadzoneDebug.setScrollFactor(0); // 固定在屏幕上，不随相机滚动
        this.deadzoneDebug.setDepth(999); // 确保在最上层
        
        // 考虑当前相机zoom值来正确绘制死区
        const zoom = this.cameras.main.zoom;
        const adjustedWidth = deadzoneWidth / zoom;
        const adjustedHeight = deadzoneHeight / zoom;
        const offsetX = (this.game.config.width - adjustedWidth) / 2;
        const offsetY = (this.game.config.height - adjustedHeight) / 2;
        
        // 绘制死区边界框（红色半透明）
        this.deadzoneDebug.fillStyle(0xff0000, 0.3);
        this.deadzoneDebug.fillRect(
            offsetX,
            offsetY,
            adjustedWidth,
            adjustedHeight
        );
        
        // 添加边框
        this.deadzoneDebug.lineStyle(2, 0xff0000, 0.8);
        this.deadzoneDebug.strokeRect(
            offsetX,
            offsetY,
            adjustedWidth,
            adjustedHeight
        );
        
        console.log(`Deadzone debug created: ${adjustedWidth}x${adjustedHeight} at zoom ${zoom}`);
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
        
        // 限制缩放范围在0.1到2之间
        newZoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
        
        // 使用动画效果调整缩放
        this.tweens.add({
            targets: this.cameras.main,
            zoom: newZoom,
            duration: 300,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // 缩放完成后重新计算死区
                this.updateDeadzone();
            }
        });
        
        // 保存到本地存储
        localStorage.setItem('cameraZoom', newZoom.toString());
    }

    // 更新死区大小以适应新的缩放级别
    updateDeadzone() {
        if (this.player && this.cameras.main) {
            const zoom = this.cameras.main.zoom;
            const screenWidth = this.game.config.width;
            const screenHeight = this.game.config.height;
            
            // 动态计算死区大小，基于缩放级别
            const baseReduction = Math.min(200, Math.min(screenWidth, screenHeight) * 0.2);
            const adjustedWidth = (screenWidth - baseReduction) / zoom;
            const adjustedHeight = (screenHeight - baseReduction) / zoom;
            
            this.cameras.main.setDeadzone(adjustedWidth, adjustedHeight);
            
            // 如果存在死区调试可视化，也更新它
            if (this.deadzoneDebug) {
                this.deadzoneDebug.destroy();
                this.createDeadzoneDebug(adjustedWidth * zoom, adjustedHeight * zoom);
            }
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
        
        // 添加鼠标滚轮事件监听，用于缩放控制
        this.input.on('wheel', (pointer, currentlyOver, deltaX, deltaY, deltaZ) => {
            // 检查是否按下了Ctrl键
            if (pointer.event.ctrlKey) {
                // 根据滚轮方向调整缩放值
                // 向上滚动缩小，向下滚动放大
                const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
                this.adjustZoom(zoomDelta);
            }
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

    // 在已绑定工位旁边放置随机角色
    placeCharactersAtOccupiedWorkstations() {
        console.log('=== Setting up characters at occupied workstations ===');
        
        // 获取所有角色图片的key
        const characterKeys = [
            'Premade_Character_48x48_01',
            'Premade_Character_48x48_02',
            'Premade_Character_48x48_03',
            'Premade_Character_48x48_04',
            'Premade_Character_48x48_05',
            'Premade_Character_48x48_06',
            'Premade_Character_48x48_07',
            'Premade_Character_48x48_08',
            'Premade_Character_48x48_09',
            'Premade_Character_48x48_10',
            'Premade_Character_48x48_11',
            'Premade_Character_48x48_12',
            'Premade_Character_48x48_13',
            'Premade_Character_48x48_14',
            'Premade_Character_48x48_15',
            'Premade_Character_48x48_16',
            'Premade_Character_48x48_17',
            'Premade_Character_48x48_18',
            'Premade_Character_48x48_19',
            'Premade_Character_48x48_20',
        ];
        
        // 获取所有已绑定的工位
        const occupiedWorkstations = this.workstationManager.getOccupiedWorkstations();
        
        occupiedWorkstations.forEach((workstation, index) => {
            console.log('workstation',workstation)
            
            // 跳过属于当前玩家的工位
            if (this.currentUser && workstation.userId === this.currentUser.id) {
                console.log(`Skipping workstation ${workstation.id} - belongs to current user ${this.currentUser.id}`);
                return;
            }
            
            // 随机选择一个角色
            const randomCharacterKey = characterKeys[Math.floor(Math.random() * characterKeys.length)];
            
            // 根据工位方向计算角色位置
            const { x: characterX, y: characterY, direction: characterDirection } = this.calculateCharacterPosition(workstation);
            
            // 为其他玩家生成随机状态数据
            const statusOptions = [
                { type: 'working', status: '工作中', emoji: '💼', message: '正在写代码...' },
                { type: 'break', status: '休息中', emoji: '☕', message: '喝杯咖啡放松一下' },
                { type: 'reading', status: '阅读中', emoji: '📚', message: '在读技术书籍' },
                { type: 'meeting', status: '会议中', emoji: '👥', message: '团队讨论中' }
            ];
            
            const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
            const playerData = {
                id: `player_${workstation.userId}_${index}`,
                name: `玩家${index + 1}`,
                currentStatus: {
                    ...randomStatus,
                    timestamp: new Date().toISOString()
                }
            };
            
            // 创建Player对象，传入随机角色和状态数据
            const character = new Player(this, characterX, characterY, randomCharacterKey, false, false, true, playerData);
            this.add.existing(character);
            
            // 根据工位方向设置角色朝向
            character.setDirectionFrame(characterDirection);
            
            // 存储角色信息到工位对象中
            workstation.character = {
                player: character,
                characterKey: randomCharacterKey,
                direction: characterDirection
            };
            
            console.log(`Placed character ${randomCharacterKey} at workstation ${workstation.id} (${characterX}, ${characterY}) facing ${characterDirection} (workstation direction: ${workstation.direction})`);
        });
        
        console.log('=== Characters placement complete ===');
    }

    // 根据工位方向计算角色位置和朝向
    calculateCharacterPosition(workstation) {
        const { position, size, direction } = workstation;
        const offsetX = -10; // 角色与工位的距离
        const offsetY = workstation.size.height; // 角色与工位的垂直距离
        
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
                characterY = position.y - offsetY - 30 ;
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
        
        return { x: characterX, y: characterY, direction: characterDirection };
    }

    // ===== 用户管理方法 =====
    getCurrentUserFromStorage() {
        try {
            const userData = localStorage.getItem('pixelDeskUser');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            console.warn('Failed to parse user data from localStorage', e);
            return null;
        }
    }

    setupUserEvents() {
        // 监听积分更新事件
        this.events.on('user-points-updated', (data) => {
            if (this.currentUser && this.currentUser.id === data.userId) {
                // 同时更新内存中的用户数据和localStorage
                this.currentUser.points = data.points;
                this.currentUser.gold = data.points; // 同时更新gold字段以确保一致性
                this.saveCurrentUser();
                this.sendUserDataToUI();
                console.log('积分更新事件处理完成，新积分:', data.points);
            }
        });

        // 监听工位绑定事件
        this.events.on('user-bound', (data) => {
            if (this.currentUser && this.currentUser.id === data.userId) {
                // 更新用户的工位列表
                if (!this.currentUser.workstations) {
                    this.currentUser.workstations = [];
                }
                
                const workstationInfo = {
                    id: data.workstationId,
                    position: data.workstation.position,
                    type: data.workstation.type,
                    boundAt: data.workstation.boundAt,
                    expiresAt: data.workstation.expiresAt
                };
                
                this.currentUser.workstations.push(workstationInfo);
                this.saveCurrentUser();
                
                // 更新UI显示工位ID
                this.sendUserDataToUI();
            }
        });
    }

    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('pixelDeskUser', JSON.stringify(this.currentUser));
        }
    }

    sendUserDataToUI() {
        if (this.currentUser) {
            // 获取当前用户的工位ID
            const userWorkstation = this.workstationManager.getWorkstationByUser(this.currentUser.id);
            const workstationId = userWorkstation ? userWorkstation.id : '';
            
            // 修复积分显示 - 优先使用points字段，如果没有则使用gold字段
            const userPoints = this.currentUser.points || this.currentUser.gold || 0;
            
            // 调试信息
            console.log('=== 工位绑定调试信息 ===');
            console.log('当前用户ID:', this.currentUser.id);
            console.log('当前用户名:', this.currentUser.username);
            console.log('用户积分:', userPoints);
            console.log('找到的工位:', userWorkstation);
            console.log('工位ID:', workstationId);
            console.log('所有用户绑定:', Array.from(this.workstationManager.userBindings.entries()));
            console.log('所有工位状态:', this.workstationManager.getAllWorkstations().map(ws => ({
                id: ws.id,
                isOccupied: ws.isOccupied,
                userId: ws.userId
            })));
            
            this.events.emit('update-user-data', {
                username: this.currentUser.username,
                points: userPoints,
                character: this.currentUser.character,
                workstationId: workstationId
            });
        }
    }

    checkExpiredWorkstations() {
        if (this.workstationManager) {
            this.workstationManager.checkExpiredWorkstations();
        }
    }

    // ===== 工位交互方法 =====
    showWorkstationBindingPrompt(workstation) {
        if (workstation && this.currentUser) {
            console.log('触发Next.js工位绑定弹窗');
            
            // 禁用玩家移动
            if (this.player && typeof this.player.disableMovement === 'function') {
                this.player.disableMovement();
                console.log('玩家移动已禁用');
            }
            
            // 调用Next.js的工位绑定回调
            if (typeof window !== 'undefined' && window.onWorkstationBinding) {
                window.onWorkstationBinding(workstation, this.currentUser);
            }
        }
    }

  
    // ===== 社交功能方法 =====
    setupSocialFeatures() {
        // 监听状态更新事件
        if (typeof window !== 'undefined') {
            window.updateMyStatus = (statusData) => {
                this.myStatus = statusData;
                console.log('我的状态已更新:', statusData);
            };
        }
        
        // 示例其他玩家已被移除，所有角色都通过工位绑定系统在工位旁边创建
        
        // 设置玩家碰撞检测
        this.setupPlayerCollisions();
    }
    
    // createSampleOtherPlayers() 方法已被移除
    // 所有角色现在都通过工位绑定系统在工位旁边创建
    
    setupPlayerCollisions() {
        // 设置主玩家与其他玩家的碰撞检测
        this.otherPlayers.forEach(otherPlayer => {
            this.physics.add.overlap(
                this.player,
                otherPlayer,
                (player1, player2) => {
                    // 确保是其他玩家触发了碰撞
                    if (player2.isOtherPlayer) {
                        player2.handleCollisionWithMainPlayer(this.player);
                    }
                },
                null,
                this
            );
        });
    }
    
    updateOtherPlayerStatus(playerId, newStatus) {
        const otherPlayer = this.otherPlayers.get(playerId);
        if (otherPlayer) {
            otherPlayer.updateStatus(newStatus);
        }
    }
    
    // ===== 清理方法 =====
    shutdown() {
        if (this.workstationManager) {
            this.workstationManager.destroy();
        }
        if (this.bindingUI) {
            this.bindingUI.hide();
        }
        
        // 清理其他玩家
        this.otherPlayers.forEach(player => player.destroy());
        this.otherPlayers.clear();
        
        super.shutdown();
    }

}