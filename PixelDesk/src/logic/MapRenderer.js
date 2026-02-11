// ===== MapRenderer =====
// Manages tilemap creation, tileset layers, and object layer rendering.
// Extracted from Start.js to reduce scene complexity.

const ENABLE_DEBUG_LOGGING = false
const ENABLE_ERROR_LOGGING = true

const debugLog = ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }

// ===== Rendering depth configuration =====
const MAP_DEPTHS = {
  FLOOR: 0,
  CARPET: 1,
  BUILDING: 5,
  FURNITURE: 10,
  BILLBOARD: 15,
  PLAYER: 100,
  NPC: 100,
  UI: 1000
}

export class MapRenderer {
  constructor(scene) {
    this.scene = scene

    // Physics groups managed by MapRenderer
    this.deskColliders = null
    this.billboardSensors = null
    this.bulletinBoardSensors = null
    this.workstationObjects = []
    this.buildingGroup = null
  }

  // ===== Tilemap Creation =====

  createTilemap() {
    return this.scene.make.tilemap({
      key: "officemap",
      tileWidth: 48,
      tileHeight: 48,
    })
  }

  createTilesetLayers(map) {
    // Add tilesets
    const tilesets = this.addTilesets(map)

    // Create layers
    const layerNames = ["background", "tree", "office_1"]
    const layers = {}

    layerNames.forEach((layerName) => {
      layers[layerName] = map.createLayer(layerName, tilesets)
    })

    // Enable render optimization - only render tiles near the screen
    if (layers.office_1) {
      // Set cull padding to 1, reducing unnecessary rendering
      layers.office_1.setCullPadding(1, 1)

      // If player already exists, set collision with this layer
      if (this.scene.player) {
        this.scene.physics.add.collider(this.scene.player, layers.office_1)
      }
    }

    return layers
  }

  addTilesets(map) {
    const tilesetConfigs = [
      ["room_floor_tileset", "room_builder_walls_image"],
      ["ice_creem_floor", "ice_creem_floor_image"],
      ["characters_list", "characters_list_image"],
      ["grassgrand", "grassgrand"],
      ["park", "park"],
      ["road", "road"],
      ["park_obj", "park_obj"],
    ]

    const addedTilesets = []
    tilesetConfigs.forEach(([tilesetName, imageKey]) => {
      // Try without imageKey first, letting Phaser use the original path from the tilemap
      const tileset = map.addTilesetImage(tilesetName)
      if (tileset) {
        addedTilesets.push(tileset)
      } else {
        // If that fails, try with imageKey
        const tilesetWithKey = map.addTilesetImage(tilesetName, imageKey)
        if (tilesetWithKey) {
          addedTilesets.push(tilesetWithKey)
        }
      }
    })

    return addedTilesets
  }

  // ===== Object Layer Rendering =====

  renderObjectLayer(map, layerName) {
    const objectLayer = map.getObjectLayer(layerName)

    if (!objectLayer) {
      debugWarn(`Object layer "${layerName}" not found`)
      return
    }

    // Only create deskColliders once to avoid overwriting
    if (!this.deskColliders) {
      this.deskColliders = this.scene.physics.add.staticGroup()
      debugLog('deskColliders group created')
    }

    // For desk_objs layer, use chunk management system
    // (optimisation: smaller layers like bookcase are rendered directly)
    if (layerName === "desk_objs") {
      debugLog(`Collecting workstation objects, total: ${objectLayer.objects.length}`)

      // Collect all workstation objects (do not create sprites yet)
      objectLayer.objects.forEach((obj) => {
        if (this.isDeskObject(obj)) {
          this.workstationObjects.push(obj)
        }
      })

      // Update desk count (temporarily; will be updated again later)
      this.scene.userData.deskCount = this.workstationObjects.length
      this.scene.sendUserDataToUI()
    } else {
      // Other layers (bookcase_objs, front_desk_objs, etc.) render normally
      // to ensure collisions take effect immediately
      objectLayer.objects.forEach((obj) => this.renderObject(obj))
    }
  }

  renderObject(obj) {
    const adjustedY = obj.y - obj.height
    let sprite = null

    // Render object
    if (obj.gid) {
      sprite = this.renderTilesetObject(obj, adjustedY)
    } else if (this.isDeskObject(obj)) {
      sprite = this.renderGeometricObject(obj, adjustedY)
    }

    // If it is a workstation object, create workstation via manager
    if (sprite && this.isDeskObject(obj)) {
      this.scene.workstationManager.createWorkstation(obj, sprite)

      // Add physics collision for desks
      this.addDeskCollision(sprite, obj)
    }

    // If it is a front desk object, register with front desk manager
    if (obj.type === "front-desk") {
      console.log(`[Start] Detected front desk object: ${obj.name} at (${obj.x}, ${obj.y})`, {
        hasSprite: !!sprite,
        hasFrontDeskManager: !!this.scene.frontDeskManager,
        spriteTexture: sprite?.texture?.key
      });

      if (sprite && this.scene.frontDeskManager) {
        this.scene.frontDeskManager.registerFrontDesk(obj, sprite)
      } else if (!sprite) {
        console.error(`[Start] Front desk object ${obj.name} has no sprite!`);
      } else if (!this.scene.frontDeskManager) {
        console.error(`[Start] FrontDeskManager not initialized!`);
      }
    }

    // Billboard / Hot Billboard objects
    const isBillboard = obj.type === "billboard" || obj.type === "hot-billboard" ||
      [5569, 5570, 5576, 5577, 5580, 5581].includes(obj.gid);

    if (isBillboard) {
      console.log(`[Start] Detected billboard object at (${obj.x}, ${obj.y}), Type: ${obj.type}`);
      if (sprite) {
        // Add physics collision so billboard is impassable
        this.addDeskCollision(sprite, obj);

        // Register with billboard manager
        if (this.scene.billboardManager) {
          this.scene.billboardManager.createBillboard(obj, sprite);
        }

        // Create sensor zone (larger than the billboard itself for easier triggering)
        if (this.billboardSensors) {
          const centerX = obj.x + (obj.width / 2);
          const centerY = adjustedY + (obj.height / 2);

          const sensor = this.scene.add.rectangle(centerX, centerY, obj.width + 120, obj.height + 120, 0x000000, 0);
          this.scene.physics.add.existing(sensor, false);
          if (sensor.body) {
            sensor.body.setImmovable(true);
          }

          // Distinguish: if it is a bulletin board (GID 5580), add to dedicated bulletin group
          if (obj.gid === 5580 || obj.type === "bulletin-board") {
            sensor.isBulletinBoard = true;
            this.bulletinBoardSensors.add(sensor);
          } else {
            this.billboardSensors.add(sensor);
          }
        }
      }
    }

    // Building objects (e.g. cafe)
    const isBuilding = obj.type === "building" || obj.name?.includes("building") ||
      [5578, 5582, 5583].includes(obj.gid);

    if (isBuilding) {
      if (sprite) {
        sprite.isBuilding = true; // Tag as building for collision callback identification
        console.log(`[Start] Adding physics collision for building at (${obj.x}, ${obj.y}), Type: ${obj.type}`);
        this.addDeskCollision(sprite, obj);

        // Add building to unified group for day/night tinting
        if (this.buildingGroup) {
          this.buildingGroup.add(sprite);
        }
      }
    }

    // Set depth for different object types
    if (sprite) {
      if (isBillboard) {
        sprite.setDepth(MAP_DEPTHS.BILLBOARD);
      } else if (isBuilding) {
        sprite.setDepth(MAP_DEPTHS.BUILDING);
      } else if (obj.name === "door_mat" || obj.gid === 58) {
        sprite.setDepth(MAP_DEPTHS.CARPET);
      } else if (this.isDeskObject(obj)) {
        sprite.setDepth(MAP_DEPTHS.FURNITURE);
      } else {
        sprite.setDepth(MAP_DEPTHS.FURNITURE); // Default: most objects at furniture level
      }
    }
  }

  // ===== Sprite Creation & Configuration =====

  renderTilesetObject(obj, adjustedY) {
    let imageKey = obj.name

    // If name is empty, try to infer from GID
    if (!imageKey && obj.gid) {
      imageKey = this.scene.assetLoader.resolveKeyByGid(obj.gid)
    }

    // If name is still empty, try to infer from type or other properties
    if (!imageKey) {
      if (obj.type === "bookcase") {
        imageKey = "bookcase_middle"
      } else {
        imageKey = "desk_image"
      }
    }

    if (!imageKey) return null

    // If texture not found, attempt dynamic loading from registry
    if (!this.scene.textures.exists(imageKey)) {
      this.scene.assetLoader.dynamicLoadTexture(imageKey)
      // Use placeholder while loading; auto-updates once loaded
      const sprite = this.scene.add.image(obj.x, adjustedY, "desk_image")
      sprite._targetTexture = imageKey
      // Save original expected size for reset after loading
      sprite._originalWidth = obj.width
      sprite._originalHeight = obj.height
      this.configureSprite(sprite, obj)
      return sprite
    }

    const sprite = this.scene.add.image(obj.x, adjustedY, imageKey)
    this.configureSprite(sprite, obj)
    return sprite
  }

  renderGeometricObject(obj, adjustedY) {
    const sprite = this.scene.add.image(obj.x, adjustedY, "desk_image")
    this.configureSprite(sprite, obj)
    return sprite
  }

  configureSprite(sprite, obj) {
    sprite.setOrigin(0, 0)
    if (obj.width && obj.height) {
      sprite.setDisplaySize(obj.width, obj.height)
    }

    // Apply object rotation (if present)
    if (obj.rotation !== undefined) {
      // Tiled uses degrees, Phaser uses radians
      const rotationRad = (obj.rotation * Math.PI) / 180
      sprite.setRotation(rotationRad)

      // Adjust coordinates after rotation
      // Tiled rotates around object center, Phaser rotates around top-left
      const centerX = obj.x + obj.width / 2
      const centerY = obj.y - obj.height / 2

      // Calculate new position after rotation
      const rotatedX =
        centerX -
        (obj.width / 2) * Math.cos(rotationRad) -
        (obj.height / 2) * Math.sin(rotationRad)
      const rotatedY =
        centerY +
        (obj.width / 2) * Math.sin(rotationRad) -
        (obj.height / 2) * Math.cos(rotationRad)

      sprite.setX(rotatedX)
      sprite.setY(rotatedY)
    }
  }

  // ===== Collision =====

  addDeskCollision(sprite, obj) {
    // Add to staticGroup first; the group manages the physics body automatically
    this.deskColliders.add(sprite)

    // Adjust collision boundary based on desk type
    const collisionSettings = this.getCollisionSettings(obj, sprite.texture.key)

    // After adding to group, the physics body is created, so we can adjust boundaries now
    if (sprite.body) {
      const originalWidth = sprite.body.width
      const originalHeight = sprite.body.height

      // Calculate new collision boundary size
      const newWidth = originalWidth * collisionSettings.scaleX
      const newHeight = originalHeight * collisionSettings.scaleY

      // Set collision boundary size (centered)
      sprite.body.setSize(newWidth, newHeight, true)

      // Offset collision boundary if needed
      if (collisionSettings.offsetX !== 0 || collisionSettings.offsetY !== 0) {
        sprite.body.setOffset(
          collisionSettings.offsetX,
          collisionSettings.offsetY
        )
      }
    }
  }

  getCollisionSettings(obj, textureKey = "") {
    const objName = obj.name || ""
    const objType = obj.type || ""

    // For "up" facing desks (desk at back, chair at front): only collide with upper half
    if (textureKey.includes("_up") || objName.includes("_up") || objType.includes("_up")) {
      return {
        scaleX: 0.8,
        scaleY: 0.4,
        offsetX: 0,
        offsetY: -20
      }
    }

    // Return different collision settings based on class/type
    if (objType === "billboard" || objName.includes("display") || objType.includes("display") || objName.includes("board")) {
      // Billboard / display - full collision boundary
      return { scaleX: 1.0, scaleY: 1.0, offsetX: 0, offsetY: 0 }
    } else if (objType === "building" || objName.includes("building")) {
      // Building - full collision boundary
      return { scaleX: 1.0, scaleY: 0.8, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("long") || objType.includes("long") || objType === "desk-long") {
      // Long desk
      return { scaleX: 0.4, scaleY: 0.4, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("single") || objType.includes("single") || objType === "desk-single" || objType === "desk") {
      // Single desk
      return { scaleX: 0.6, scaleY: 0.6, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("bookcase") || objType.includes("bookcase")) {
      // Bookcase
      return { scaleX: 0.7, scaleY: 0.7, offsetX: 0, offsetY: 0 }
    } else if (objName.includes("sofa") || objType.includes("sofa")) {
      // Sofa
      return { scaleX: 0.5, scaleY: 0.3, offsetX: 0, offsetY: 0 }
    } else {
      // Default settings
      return { scaleX: 0.5, scaleY: 0.5, offsetX: 0, offsetY: 0 }
    }
  }

  // ===== Workstation Sprite (called by chunk system) =====

  createWorkstationSprite(obj, adjustedY) {
    let imageKey = obj.name

    // If name is empty, try to infer from GID
    if (!imageKey && obj.gid) {
      imageKey = this.scene.assetLoader.resolveKeyByGid(obj.gid)
    }

    // If name is still empty, try to infer from type or other properties
    if (!imageKey) {
      if (obj.type === "bookcase") {
        imageKey = "bookcase_middle"
      } else {
        imageKey = "desk_image"
      }
    }

    if (!imageKey) return null

    // If texture not found, attempt dynamic loading (mirrors renderTilesetObject logic)
    if (!this.scene.textures.exists(imageKey)) {
      this.scene.assetLoader.dynamicLoadTexture(imageKey)
      // Use placeholder while loading; auto-updates once loaded
      const sprite = this.scene.add.image(obj.x, adjustedY, "desk_image")
      sprite._targetTexture = imageKey
      // Save original expected size for reset after loading
      sprite._originalWidth = obj.width
      sprite._originalHeight = obj.height
      this.configureSprite(sprite, obj)
      return sprite
    }

    const sprite = this.scene.add.image(obj.x, adjustedY, imageKey)
    this.configureSprite(sprite, obj)
    return sprite
  }

  // ===== Utility =====

  isDeskObject(obj) {
    if (!obj) return false;

    // Identify workstation objects: supports Type identification and traditional Name/GID identification
    const type = obj.type || obj.class || ""; // Compatible with Tiled class
    const name = obj.name || "";
    const gid = obj.gid || 0;

    return (
      type === "desk" ||
      type === "workstation" ||
      name === "desk" ||
      name.includes("desk_") ||
      type === "bookcase" ||
      name.includes("bookcase") ||
      gid === 106 || // bookcase_tall
      gid === 107 || // bookcase_middle
      gid === 118 || // cofe_desk_up
      type === "sofa" ||
      type === "flower"
    );
  }

  // ===== Cleanup =====

  destroy() {
    this.deskColliders = null
    this.billboardSensors = null
    this.bulletinBoardSensors = null
    this.workstationObjects = []
    this.buildingGroup = null
    this.scene = null
  }
}
