// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  ENABLE_DEBUG_LOGGING: false,
  ENABLE_ERROR_LOGGING: true,
  ENABLE_PERFORMANCE_LOGGING: false
}

const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }
const debugError = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.error.bind(console) : () => { }

export class AssetLoader {
  constructor(scene) {
    this.scene = scene;

    // 动态资源注册表 (按需加载)
    this.dynamicAssetRegistry = {
      // 书架 (优先使用 webp)
      "bookcase_middle": "/assets/desk/library_bookcase_normal.png",
      "library_bookcase_normal": "/assets/desk/library_bookcase_normal.png",
      "bookcase_tall": "/assets/desk/library_bookcase_tall.webp",
      "library_bookcase_tall": "/assets/desk/library_bookcase_tall.webp",
      "library_bookcase_tall_webp": "/assets/desk/library_bookcase_tall.webp",
      "Classroom_and_Library_Singles_48x48_58": "/assets/desk/Classroom_and_Library_Singles_48x48_58.png",

      // 地垫 / 门垫 (GID 58)
      "door_mat": "/assets/desk/Classroom_and_Library_Singles_48x48_58.png",

      // 洗手间
      "Shadowless_washhand": "/assets/bathroom/Shadowless_washhand.png",
      "Bathroom_matong": "/assets/bathroom/Bathroom_matong.png",
      "Shadowless_glass_2": "/assets/bathroom/Shadowless_glass_2.webp",
      "Shadowless_glass": "/assets/bathroom/Shadowless_glass.png",
      "Shadowless": "/assets/bathroom/Shadowless.webp",

      // 沙发
      "sofa-left-1": "/assets/sofa/sofa-left-1.png",
      "sofa-left-2": "/assets/sofa/sofa-left-2.png",
      "sofa-left-3": "/assets/sofa/sofa-left-3.png",
      "sofa-right-1": "/assets/sofa/sofa-right-1.png",
      "sofa-right-2": "/assets/sofa/sofa-right-2.png",
      "sofa-right-3": "/assets/sofa/sofa-right-3.png",

      // 大桌/管理桌
      "desk-big-manager-left-1": "/assets/desk/desk-big-manager-left-1.png",
      "desk-big-manager-center-1": "/assets/desk/desk-big-manager-center-1.png",
      "desk-big-manager-right-1": "/assets/desk/desk-big-manager-right-1.png",
      "desk-big-manager-center-2": "/assets/desk/desk-big-manager-center-2.png",

      // Park 系列工位
      "desk_park_short_down": "/assets/desk/desk_park_short_down.png",
      "desk_park_short_top": "/assets/desk/desk_park_short_top.png",
      "desk_park_long_top": "/assets/desk/desk_park_long_top.png",

      // 装饰/其他
      "flower": "/assets/tileset/flower.png",
      "rug": "/assets/tileset/rug.png",
      "cabinet": "/assets/tileset/cabinet.png",
      "stair-red": "/assets/tileset/stair-red.png",
      "announcement_board_wire": "/assets/announcement_board_wire.webp",
      "front_wide_display": "/assets/front_wide_display.webp",
      "wall_decoration_1": "/assets/desk/Classroom_and_Library_Singles_48x48_31.png",
      "wall_decoration_2": "/assets/desk/Classroom_and_Library_Singles_48x48_32.png",
      "wall_decoration_3": "/assets/desk/Classroom_and_Library_Singles_48x48_33.png",
      "wall_decoration_4": "/assets/desk/Classroom_and_Library_Singles_48x48_39.png",
      "wall_decoration_5": "/assets/desk/Classroom_and_Library_Singles_48x48_36.png",
      "pixel_cafe_building": "/assets/building/pixel_cafe_building_512.png",
      "wook_building": "/assets/building/wook_building_512.png",
      "cofe_desk_up": "/assets/desk/cofe_desk_up.png"
    };

    // 正在进行的动态加载任务
    this.pendingLoads = new Set();
    this.failedLoads = new Set(); // 记录加载失败的资源，避免循环重试
    this.loadTimer = null;
    this.characterConfigs = null; // 在 loadCharacterSprites 中初始化
  }

  preload() {
    this.loadTilemap();
    this.loadTilesetImages();
    this.loadLibraryImages();
  }

  loadTilemap() {
    this.scene.load.tilemapTiledJSON("officemap", "/assets/officemap.json")
  }

  loadTilesetImages() {
    const tilesetAssets = {
      room_builder_walls_image: "/assets/floor/Room_Builder_Walls_48x48.png",
      ice_creem_floor_image:
        "/assets/floor/Ice_Cream_Shop_Design_layer_1_48x48.png",
      grassgrand: "/assets/tileset/grassgrand.png",
      park: "/assets/tileset/park.jpeg",
      road: "/assets/tileset/road.png",
      park_obj: "/assets/tileset/park_obj.png",
    }

    Object.entries(tilesetAssets).forEach(([key, path]) => {
      this.scene.load.image(key, path)
    })

    const spriteAssets = {
      characters_list_image: "/assets/player/me.png",
    }

    Object.entries(spriteAssets).forEach(([key, path]) => {
      this.scene.load.spritesheet(key, path, { frameWidth: 48, frameHeight: 48 })
    })

    // 动态加载角色图片（从API获取）
    // 使用 Phaser 的 file loading pattern
    const charactersFileKey = 'characters-data'
    this.scene.load.json(charactersFileKey, '/api/characters?pageSize=1000')

    // 监听角色数据加载完成
    this.scene.load.once(`filecomplete-json-${charactersFileKey}`, (_key, _type, data) => {
      this.loadCharacterSprites(data)
    })
  }

  loadLibraryImages() {
    // 核心必需图像 (最小化预加载 - 确保基本场景可见)
    this.scene.load.image("desk_image", "/assets/desk/desk_long_right.png")
    this.scene.load.image("desk_long_right", "/assets/desk/desk_long_right.png")
    this.scene.load.image("desk_long_left", "/assets/desk/desk_long_left.png")
    this.scene.load.image("single_desk", "/assets/desk/single_desk.png")
    this.scene.load.image("desk_short_right", "/assets/desk/single_desk.png")

    // 其余资源已移至 this.dynamicAssetRegistry 进行按需加载
  }

  /**
   * 优化后的角色加载逻辑：仅存储配置，不立即预加载所有图片
   */
  loadCharacterSprites(apiResponse) {
    try {
      if (!apiResponse || !apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
        debugError('Invalid character data from API')
        this.loadDefaultCharacter()
        return
      }

      // 存储角色配置信息供后续使用
      this.characterConfigs = new Map()

      // 收集所有角色配置
      apiResponse.data.forEach((character) => {
        this.characterConfigs.set(character.name, {
          isCompactFormat: character.isCompactFormat,
          totalFrames: character.totalFrames,
          frameWidth: character.frameWidth,
          frameHeight: character.frameHeight,
          imageUrl: character.imageUrl // 保存URL，用于后续按需加载
        })
      })

      debugLog(`✅ Registered ${apiResponse.data.length} character configs (lazy loading enabled)`)

    } catch (error) {
      debugError('Error loading character sprites:', error)
      this.loadDefaultCharacter()
    }
  }

  /**
   * 按需加载角色纹理
   */
  async ensureCharacterTexture(characterName) {
    if (this.scene.textures.exists(characterName)) return true;

    const config = this.characterConfigs?.get(characterName);
    if (!config || !config.imageUrl) return false;

    // 避免并发重复加载同一个角色
    const loadKey = `char_${characterName}`;
    if (this.pendingLoads.has(loadKey)) {
      return new Promise((resolve) => {
        this.scene.load.once(`filecomplete-spritesheet-${characterName}`, () => resolve(true));
        this.scene.load.once(`loaderror-spritesheet-${characterName}`, () => resolve(false));
      });
    }

    this.pendingLoads.add(loadKey);

    return new Promise((resolve) => {
      this.scene.load.spritesheet(characterName, config.imageUrl, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight
      });

      this.scene.load.once(`filecomplete-spritesheet-${characterName}`, () => {
        this.pendingLoads.delete(loadKey);
        debugLog(`🎉 [LazyLoad] Character ${characterName} loaded on-demand`);
        resolve(true);
      });

      this.scene.load.once(`loaderror-spritesheet-${characterName}`, () => {
        this.pendingLoads.delete(loadKey);
        debugError(`❌ [LazyLoad] Failed to load character ${characterName}`);
        resolve(false);
      });

      this.scene.load.start();
    });
  }

  /**
   * 加载默认角色作为后备
   */
  loadDefaultCharacter() {
    debugWarn('Loading default character as fallback')
    this.characterConfigs = new Map()
    this.characterConfigs.set('hangli', {
      isCompactFormat: true,
      totalFrames: 8,
      frameWidth: 48,
      frameHeight: 48
    })
    this.scene.load.spritesheet('hangli', '/assets/characters/hangli.png', {
      frameWidth: 48,
      frameHeight: 48,
    })
    this.scene.load.start()
  }

  resolveKeyByGid(gid) {
    if (!gid) return null;

    // 1. 动态查找 Tileset (核心：防止 GID 位移)
    if (this.scene.map) {
      const tileset = this.scene.map.getTilesetByGID(gid);
      if (tileset) {
        const tsName = tileset.name.toLowerCase();

        // 根据 Tileset 名称映射资源
        if (tsName.includes("announcement")) return "announcement_board_wire";
        if (tsName.includes("display")) return "front_wide_display";
        if (tsName.includes("cafe_building")) return "pixel_cafe_building";
        if (tsName.includes("wook_building")) return "wook_building";
        if (tsName.includes("cofe_desk")) return "cofe_desk_up";
        if (tsName.includes("tall_bookcase")) return "bookcase_tall";
        if (tsName.includes("hospital")) return "wall_decoration_1"; // 医院系列映射到装饰图
        if (tsName.includes("bathroom")) {
          if (gid % 5 === 0) return "Bathroom_matong";
          if (gid % 5 === 1) return "Shadowless_washhand";
          if (gid % 5 === 2 || gid % 5 === 4) return "Shadowless_glass_2";
          if (gid % 5 === 3) return "Shadowless_glass";
          return "Shadowless";
        }
        // 可以根据需要添加更多 Tileset 映射
      }
    }

    // 2. 静态 GID 映射 (回退方案)
    if (gid === 87) return "sofa-left-1"
    if (gid === 88) return "sofa-left-2"
    if (gid === 89) return "sofa-left-3"
    if (gid === 90) return "sofa-right-1"
    if (gid === 91) return "sofa-right-2"
    if (gid === 92) return "sofa-right-3"
    if (gid === 106) return "bookcase_tall"
    if (gid === 107) return "bookcase_middle"
    if (gid === 108) return "wall_decoration_1"
    if (gid === 109) return "wall_decoration_2"
    if (gid === 110) return "wall_decoration_3"
    if (gid === 111) return "wall_decoration_5"
    if (gid === 112) return "wall_decoration_4"
    if (gid === 58) return "door_mat"
    if (gid === 5569 || gid === 5576 || gid === 5580) return "announcement_board_wire"
    if (gid === 5570 || gid === 5577 || gid === 5581) return "front_wide_display"
    if (gid === 5582) return "pixel_cafe_building"
    if (gid === 5583) return "wook_building"
    if (gid === 3815) return "Bathroom_matong"
    if (gid === 3817) return "Shadowless_washhand"
    if (gid === 3819) return "Shadowless_glass_2"
    if (gid === 118) return "cofe_desk_up"
    return null
  }

  /**
   * 动态加载纹理并更新现有精灵 (优化版：分步处理+防抖加载)
   */
  dynamicLoadTexture(key) {
    if (this.scene.textures.exists(key) || this.pendingLoads.has(key) || this.failedLoads.has(key)) return

    const path = this.dynamicAssetRegistry[key]
    if (!path) return

    this.pendingLoads.add(key)
    debugLog(`🚚 [LazyLoad] 准备加载: ${key}`)

    this.scene.load.image(key, path)

    // 监听单个文件完成
    this.scene.load.once(`filecomplete-image-${key}`, (fileKey, type, texture) => {
      debugLog(`✅ [LazyLoad] 单个资源加载完成: ${fileKey}`)
      this.pendingLoads.delete(fileKey)
      this.updatePendingSprites(fileKey)
    })

    // 监听加载错误
    this.scene.load.once(`loaderror-image-${key}`, (fileKey) => {
      debugWarn(`❌ [LazyLoad] 资源加载失败: ${fileKey}`)
      this.pendingLoads.delete(fileKey)
      this.failedLoads.add(fileKey)
    })

    // 使用 debounce 机制，确保一帧内多个资源的加载只触发一次 start()
    if (this.loadTimer) clearTimeout(this.loadTimer)
    this.loadTimer = setTimeout(() => {
      if (this.scene.load.isLoading()) {
        // 如果加载器正在忙，确保当前加载完成后再次检查队列
        this.scene.load.once('complete', () => {
          if (this.pendingLoads.size > 0) {
            debugLog(`🔄 [LazyLoad] 忙碌结束，启动后续队列`)
            this.scene.load.start()
          }
        })
        return
      }
      debugLog(`🚀 [LazyLoad] 启动加载器循环`)
      this.scene.load.start()
      this.loadTimer = null
    }, 50)
  }

  /**
   * 刷新那些等待特定纹理的精灵
   */
  updatePendingSprites(specificKey = null) {
    this.scene.children.list.forEach(child => {
      // 如果指定了 specificKey，则只更新匹配该 key 的精灵
      const targetKey = child._targetTexture
      if (!targetKey) return
      if (specificKey && targetKey !== specificKey) return

      if (this.scene.textures.exists(targetKey)) {
        // 关键：检查是否是无效的 missing 纹理
        const texture = this.scene.textures.get(targetKey)
        if (texture.key === '__MISSING') return

        if (typeof child.setTexture === 'function') {
          child.setTexture(targetKey)
          // 重新应用大小，防止纹理切换后显示异常
          if (child._originalWidth && child._originalHeight) {
            child.setDisplaySize(child._originalWidth, child._originalHeight)
          }
          delete child._targetTexture
          debugLog(`✨ [LazyLoad] 精灵贴图已更新: ${targetKey}`)
        }
      }
    })
  }

  destroy() {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.pendingLoads.clear();
    this.failedLoads.clear();
    this.characterConfigs = null;
    this.scene = null;
  }
}
