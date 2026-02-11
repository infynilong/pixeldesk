// ===== PlayerCollisionManager =====
// Manages all player collision detection: player-to-player, player-to-workstation furniture,
// player-to-front-desk, and related debounce/history logic.
// Extracted from Start.js to reduce scene complexity.

const ENABLE_DEBUG_LOGGING = false
const ENABLE_ERROR_LOGGING = true

const debugLog = ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }

export class PlayerCollisionManager {
  constructor(scene) {
    this.scene = scene

    // Collision state (was this.collisionManager object on scene)
    this.activeCollisions = new Set()
    this.debounceTimers = new Map()
    this.debounceDelay = 800
    this.collisionThreshold = 70

    // Physics references
    this.otherPlayersGroup = null
    this.playerCharacterCollider = null
    this.playerDeskCollider = null

    // Front desk tracking
    this.currentCollidingDesk = null

    // Debounce timestamps for desk/bookcase/building collider callback
    this.lastLibraryTriggerTime = null
    this.lastFrontDeskTriggerTime = null
    this.lastBuildingTriggerTime = null

    // Collision history
    this.collisionHistory = []
  }

  /**
   * Called after player and physics groups are ready.
   * Initializes physics group, sets up all collision overlaps and event handlers.
   */
  init() {
    const scene = this.scene

    // Create the other-players physics group (was initialized in Start.create)
    if (!this.otherPlayersGroup) {
      this.otherPlayersGroup = scene.physics.add.group({ immovable: true })
      this.otherPlayersGroup.setDepth(100) // MAP_DEPTHS.PLAYER
    }

    // Setup collision event handlers (window.onPlayerCollisionStart/End/onPlayerCollision)
    this.setupCollisionEventHandlers()

    // Setup player-to-player collisions (overlay with otherPlayers map)
    this.setupPlayerCollisions()
  }

  /**
   * Called from scene update() periodically.
   * Runs proximity checks and front-desk collision end detection.
   */
  update(updateCounter) {
    // Every 10 frames: check own workstation proximity
    if (updateCounter % 10 === 0) {
      if (this.scene.currentUser) {
        this.checkMyWorkstationProximity()
      }
    }

    // Every 30 frames: check if player left front desk area
    if (updateCounter % 30 === 0 && this.scene.frontDeskManager && this.scene.player) {
      this.checkFrontDeskCollisionEnd()
    }
  }

  // ===== Setup Methods =====

  setupCollisionEventHandlers() {
    if (typeof window === 'undefined') return

    // Collision start event handler
    window.onPlayerCollisionStart = (collisionEvent) => {
      const customEvent = new CustomEvent("player-collision-start", {
        detail: collisionEvent,
      })
      window.dispatchEvent(customEvent)
      this.handleCollisionStartEvent(collisionEvent)
    }

    // Collision end event handler
    window.onPlayerCollisionEnd = (collisionEvent) => {
      const customEvent = new CustomEvent("player-collision-end", {
        detail: collisionEvent,
      })
      window.dispatchEvent(customEvent)
      this.handleCollisionEndEvent(collisionEvent)
    }

    // Backward-compatible collision handler
    if (!window.onPlayerCollision) {
      window.onPlayerCollision = (playerData) => {
        const customEvent = new CustomEvent("player-collision", {
          detail: { playerData },
        })
        window.dispatchEvent(customEvent)
      }
    }
  }

  handleCollisionStartEvent(collisionEvent) {
    if (!this.collisionHistory) {
      this.collisionHistory = []
    }

    this.collisionHistory.push({
      ...collisionEvent,
      eventType: "start",
    })

    if (this.collisionHistory.length > 50) {
      this.collisionHistory.shift()
    }
  }

  handleCollisionEndEvent(collisionEvent) {
    if (!this.collisionHistory) {
      this.collisionHistory = []
    }

    this.collisionHistory.push({
      ...collisionEvent,
      eventType: "end",
    })

    if (this.collisionHistory.length > 50) {
      this.collisionHistory.shift()
    }
  }

  setupPlayerCollisions() {
    const scene = this.scene

    // Setup overlap for existing otherPlayers (legacy Map on scene)
    debugLog('setupPlayerCollisions: otherPlayers count:', scene.otherPlayers.size)
    scene.otherPlayers.forEach((otherPlayer) => {
      scene.physics.add.overlap(
        scene.player,
        otherPlayer,
        (player1, player2) => {
          if (player2.isOtherPlayer) {
            this.handlePlayerCollision(player1, player2)
          }
        },
        null,
        scene
      )
    })

    // Setup workstation character collisions
    this.setupWorkstationCharacterCollisions()

    // Setup workstation furniture overlap
    this.setupWorkstationFurnitureCollisions()
  }

  setupWorkstationFurnitureCollisions() {
    const scene = this.scene
    if (!scene.player || !scene.mapRenderer?.deskColliders) return

    debugLog('[PlayerCollisionManager] Setting up workstation furniture overlap')
    scene.physics.add.overlap(
      scene.player,
      scene.mapRenderer?.deskColliders,
      (player, desk) => {
        this.handleWorkstationFurnitureOverlap(player, desk)
      },
      null,
      scene
    )
  }

  setupWorkstationCharacterCollisions() {
    const scene = this.scene

    // Delayed setup to ensure workstation characters are created
    scene.time.delayedCall(500, () => {
      const workstations = scene.workstationManager.getAllWorkstations()

      workstations.forEach((workstation) => {
        // Check new character sprite structure
        if (workstation.characterSprite && workstation.characterSprite.isOtherPlayer) {
          const character = workstation.characterSprite

          scene.physics.add.overlap(
            scene.player,
            character,
            (player1, player2) => {
              if (player2.isOtherPlayer) {
                this.handlePlayerCollision(player1, player2)
              }
            },
            null,
            scene
          )

          debugLog("Setup workstation character collision:", character.playerData.name)
        }
        // Support old structure for compatibility
        else if (
          workstation.character &&
          workstation.character.player &&
          workstation.character.player.isOtherPlayer
        ) {
          const character = workstation.character.player

          scene.physics.add.overlap(
            scene.player,
            character,
            (player1, player2) => {
              if (player2.isOtherPlayer) {
                this.handlePlayerCollision(player1, player2)
              }
            },
            null,
            scene
          )

          debugLog("Setup workstation character collision (old structure):", character.playerData.name)
        }
      })
    })
  }

  // ===== Collision Handlers =====

  handleWorkstationFurnitureOverlap(player, desk) {
    const scene = this.scene

    // Only check when player is stationary
    if (player.body && (player.body.velocity.x !== 0 || player.body.velocity.y !== 0)) {
      return
    }

    if (!scene.currentUser || !desk.workstationId) {
      return
    }

    const myBoundWorkstationId = scene.currentUser.workstationId

    const userWorkstation = myBoundWorkstationId ?
      { id: myBoundWorkstationId } :
      scene.workstationManager.getWorkstationByUser(scene.currentUser.id)

    if (!userWorkstation || String(userWorkstation.id) !== String(desk.workstationId)) {
      return
    }

    // Distance check to avoid false triggers
    const deskCenterX = desk.x + (desk.displayWidth || desk.width || 48) / 2
    const deskCenterY = desk.y + (desk.displayHeight || desk.height || 48) / 2
    const distance = Phaser.Math.Distance.Between(player.x, player.y, deskCenterX, deskCenterY)

    if (distance > 70) {
      console.log(`[Workstation collision] Distance too far (${Math.round(distance)}px > 70px), skipping`)
      return
    }

    const workstationId = desk.workstationId
    const collisionId = `workstation_${workstationId}`

    // If this is a new collision
    if (!this.activeCollisions.has(collisionId)) {
      this.activeCollisions.add(collisionId)

      console.log(`[Phaser] Workstation furniture collision! workstationId: ${workstationId}, userId: ${scene.currentUser.id}, boundWorkstationId: ${myBoundWorkstationId}`)

      // Dispatch custom event to React components
      if (typeof window !== 'undefined') {
        console.log(`[Phaser] Dispatching my-workstation-collision-start event`)
        window.dispatchEvent(new CustomEvent('my-workstation-collision-start', {
          detail: {
            workstationId,
            userId: scene.currentUser.id,
            position: { x: desk.x, y: desk.y }
          }
        }))
      }
    }

    // Reset debounce timer
    this.resetWorkstationCollisionDebounceTimer(collisionId, player, desk)
  }

  resetWorkstationCollisionDebounceTimer(collisionId, player, desk) {
    const scene = this.scene

    if (this.debounceTimers.has(collisionId)) {
      scene.time.removeEvent(this.debounceTimers.get(collisionId))
    }

    const timer = scene.time.delayedCall(
      this.debounceDelay,
      () => {
        if (this.activeCollisions.has(collisionId)) {
          // Sticky check: even without physical contact, if still nearby, keep collision active
          const deskWidth = desk.displayWidth || desk.width || 48
          const deskHeight = desk.displayHeight || desk.height || 48

          const deskCenterX = desk.x + (desk.originX === 0 ? deskWidth / 2 : 0)
          const deskCenterY = desk.y + (desk.originY === 0 ? deskHeight / 2 : 0)

          const dist = Phaser.Math.Distance.Between(player.x, player.y, deskCenterX, deskCenterY)

          if (dist < 100) {
            this.resetWorkstationCollisionDebounceTimer(collisionId, player, desk)
          } else {
            console.log(`[Collision end] Left workstation: ${collisionId}, distance: ${Math.round(dist)}`)
            this.activeCollisions.delete(collisionId)

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('my-workstation-collision-end', {
                detail: { workstationId: collisionId.replace('workstation_', '') }
              }))
            }
          }
        }
      }
    )
    this.debounceTimers.set(collisionId, timer)
  }

  handlePlayerCollision(mainPlayer, otherPlayer) {
    const playerId = otherPlayer.playerData.id

    // If other player is an AI NPC, make it face the player
    if (playerId.toString().startsWith('npc_') && typeof otherPlayer.setDirectionFrame === 'function') {
      const dx = mainPlayer.x - otherPlayer.x
      const dy = mainPlayer.y - otherPlayer.y

      if (Math.abs(dx) > Math.abs(dy)) {
        otherPlayer.setDirectionFrame(dx > 0 ? 'right' : 'left')
      } else {
        otherPlayer.setDirectionFrame(dy > 0 ? 'down' : 'up')
      }

      // Stop NPC movement on collision
      if (otherPlayer.body) {
        otherPlayer.body.setVelocity(0, 0)
      }
    }

    // If this is a new collision
    if (!this.activeCollisions.has(playerId)) {
      this.activeCollisions.add(playerId)

      otherPlayer.handleCollisionStart(mainPlayer)

      // Backward-compatible collision handler
      if (window.onPlayerCollision) {
        window.onPlayerCollision(otherPlayer.playerData)
      }
    }

    // Reset debounce timer
    this.resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer)
  }

  resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer) {
    const scene = this.scene

    if (this.debounceTimers.has(playerId)) {
      scene.time.removeEvent(this.debounceTimers.get(playerId))
    }

    const timer = scene.time.delayedCall(
      this.debounceDelay,
      () => {
        if (this.activeCollisions.has(playerId)) {
          const dist = Phaser.Math.Distance.Between(mainPlayer.x, mainPlayer.y, otherPlayer.x, otherPlayer.y)

          if (dist < this.collisionThreshold) {
            // Auto-renew
            this.resetCollisionDebounceTimer(playerId, mainPlayer, otherPlayer)
            return
          }

          // Distance too far, disconnect
          this.activeCollisions.delete(playerId)
          otherPlayer.handleCollisionEnd(mainPlayer)
          this.debounceTimers.delete(playerId)
        }
      }
    )

    this.debounceTimers.set(playerId, timer)
  }

  // ===== Collision Detection Update =====

  updateCollisionDetection() {
    const scene = this.scene
    if (!scene.player || !scene.player.body) return

    this.activeCollisions.forEach((playerId) => {
      const otherPlayer = this.getOtherPlayerById(playerId)
      if (otherPlayer && otherPlayer.body) {
        const distance = Phaser.Math.Distance.Between(
          scene.player.x,
          scene.player.y,
          otherPlayer.x,
          otherPlayer.y
        )

        const threshold = this.collisionThreshold || 60
        if (distance > threshold) {
          this.endCollisionImmediately(playerId, otherPlayer)
        }
      }
    })
  }

  endCollisionImmediately(playerId, otherPlayer) {
    const scene = this.scene

    this.activeCollisions.delete(playerId)

    if (this.debounceTimers.has(playerId)) {
      scene.time.removeEvent(this.debounceTimers.get(playerId))
      this.debounceTimers.delete(playerId)
    }

    otherPlayer.handleCollisionEnd(scene.player)
  }

  // ===== Utility Methods =====

  getOtherPlayerById(playerId) {
    const scene = this.scene

    for (const [, player] of scene.otherPlayers) {
      if (player.playerData.id === playerId) {
        return player
      }
    }

    // Check workstation-bound characters
    const workstations = scene.workstationManager.getAllWorkstations()
    for (const workstation of workstations) {
      if (
        workstation.character &&
        workstation.character.player &&
        workstation.character.player.playerData.id === playerId
      ) {
        return workstation.character.player
      }
    }

    return null
  }

  addCollisionForWorkstationCharacter(character) {
    if (character && character.isOtherPlayer) {
      if (this.otherPlayersGroup) {
        this.otherPlayersGroup.add(character)
        console.log(`Character ${character.playerData.name} added to player group, group size: ${this.otherPlayersGroup.getLength()}`)

        // Ensure group overlap detector is created
        this.ensurePlayerCharacterOverlap()
      }
    }
  }

  ensurePlayerCharacterOverlap() {
    const scene = this.scene

    if (this.playerCharacterCollider) {
      return
    }

    if (!scene.player || !this.otherPlayersGroup) {
      return
    }

    if (this.otherPlayersGroup.getLength() === 0) {
      console.log('otherPlayersGroup empty, waiting for next add')
      return
    }

    this.playerCharacterCollider = scene.physics.add.overlap(
      scene.player,
      this.otherPlayersGroup,
      (player1, player2) => {
        if (player2.isOtherPlayer) {
          this.handlePlayerCollision(player1, player2)
        }
      },
      null,
      scene
    )

    console.log(`Player-character group overlap created! (1 overlap detector for ${this.otherPlayersGroup.getLength()} characters)`)
  }

  ensurePlayerDeskCollider() {
    const scene = this.scene

    console.log('[ensurePlayerDeskCollider] called', {
      colliderExists: !!this.playerDeskCollider,
      playerExists: !!scene.player,
      groupExists: !!scene.mapRenderer?.deskColliders,
      groupSize: scene.mapRenderer?.deskColliders?.getLength() || 0
    })

    if (this.playerDeskCollider) {
      console.log('Collider already exists, skipping')
      return
    }

    if (!scene.player || !scene.mapRenderer?.deskColliders) {
      console.warn('Player or deskColliders missing')
      return
    }

    const groupLength = scene.mapRenderer?.deskColliders.getLength()
    if (groupLength === 0) {
      console.log('deskColliders empty, waiting for next load')
      return
    }

    this.playerDeskCollider = scene.physics.add.collider(
      scene.player,
      scene.mapRenderer?.deskColliders,
      (player, deskSprite) => {
        // Check if bookcase
        if (deskSprite.texture.key.includes("bookcase")) {
          if (this.lastLibraryTriggerTime && Date.now() - this.lastLibraryTriggerTime < 1000) {
            return;
          }
          this.lastLibraryTriggerTime = Date.now();

          window.dispatchEvent(new CustomEvent('open-library', {
            detail: {
              bookcaseId: deskSprite.workstationId
            }
          }));

          debugLog(`Library popup triggered, bookcase ID: ${deskSprite.workstationId}`);
        }
        // Check if front desk
        else if (deskSprite.deskId) {
          if (this.lastFrontDeskTriggerTime && Date.now() - this.lastFrontDeskTriggerTime < 1000) {
            return;
          }
          this.lastFrontDeskTriggerTime = Date.now();

          this.currentCollidingDesk = {
            id: deskSprite.deskId,
            name: deskSprite.deskName,
            serviceScope: deskSprite.serviceScope,
            greeting: deskSprite.greeting,
            workingHours: deskSprite.workingHours
          };

          window.dispatchEvent(new CustomEvent('front-desk-collision-start', {
            detail: this.currentCollidingDesk
          }));

          console.log(`[Collision] Front desk interaction: ${deskSprite.deskName} (${deskSprite.serviceScope})`);
        }
        // Check if building
        else if (deskSprite.isBuilding) {
          if (this.lastBuildingTriggerTime && Date.now() - this.lastBuildingTriggerTime < 2000) {
            return;
          }
          this.lastBuildingTriggerTime = Date.now();

          console.log('[Start] Player hit a building, triggering prompt');
          window.dispatchEvent(new CustomEvent('building-under-renovation', {
            detail: {
              name: deskSprite.texture.key === 'wook_building' ? 'Wook Building' : 'Pixel Cafe'
            }
          }));
        }
      }
    )
    console.log(`Player-desk group collider created! (1 collider for ${groupLength} desks)`)
  }

  // ===== Proximity Checks =====

  checkFrontDeskCollisionEnd() {
    const scene = this.scene

    if (!this.currentCollidingDesk) return

    const collidingDesks = scene.frontDeskManager.getCollidingDesks(scene.player, 80)

    if (collidingDesks.length === 0) {
      console.log(`[Collision end] Left front desk: ${this.currentCollidingDesk.name}`)
      this.currentCollidingDesk = null

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('front-desk-collision-end'))
      }
    }
  }

  checkMyWorkstationProximity() {
    const scene = this.scene
    if (!scene.player || !scene.currentUser) return

    let myWorkstationId = scene.currentUser.workstationId

    // If currentUser has no workstationId, try to find it from the manager
    if (!myWorkstationId && scene.workstationManager) {
      const boundWs = scene.workstationManager.getWorkstationByUser(scene.currentUser.id)
      if (boundWs) {
        myWorkstationId = boundWs.id
        scene.currentUser.workstationId = myWorkstationId
        console.log(`[Proximity] Auto-recovered workstation ID: ${myWorkstationId}`)
      }
    }

    if (!myWorkstationId) return

    const wsIdStr = String(myWorkstationId);
    let desk = scene.loadedWorkstations.get(wsIdStr);

    // Fallback: if loadedWorkstations used Number key (legacy)
    if (!desk) {
      desk = scene.loadedWorkstations.get(Number(wsIdStr));
    }

    if (!desk) {
      return
    }

    const deskWidth = desk.displayWidth || desk.width || 48
    const deskHeight = desk.displayHeight || desk.height || 48
    const deskCenterX = desk.x + (desk.originX === 0 ? deskWidth / 2 : 0)
    const deskCenterY = desk.y + (desk.originY === 0 ? deskHeight / 2 : 0)

    const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, deskCenterX, deskCenterY)

    if (dist < 100) {
      if (!this.activeCollisions.has(`workstation_${myWorkstationId}`)) {
        console.log(`[Proximity] Near workstation: ${myWorkstationId}, distance: ${Math.round(dist)}`)
      }
      this.handleWorkstationFurnitureOverlap(scene.player, desk)
    }
  }

  // ===== Query Methods =====

  getCurrentCollisions() {
    const currentCollisions = []

    this.activeCollisions.forEach((playerId) => {
      const player = this.getOtherPlayerById(playerId)
      if (player) {
        currentCollisions.push(player.playerData)
      }
    })

    return currentCollisions
  }

  getCollisionHistory() {
    return this.collisionHistory || []
  }

  setCollisionSensitivity(radius) {
    this.collisionThreshold = radius
    debugLog("Collision sensitivity set to:", radius)
  }

  // ===== Cleanup =====

  destroy() {
    // Clear debounce timers
    if (this.debounceTimers) {
      this.debounceTimers.forEach((timer) => {
        if (this.scene && this.scene.time) {
          this.scene.time.removeEvent(timer)
        }
      })
      this.debounceTimers.clear()
    }

    // Clear active collisions
    if (this.activeCollisions) {
      this.activeCollisions.clear()
    }

    // Clear collision history
    this.collisionHistory = []

    // Clear physics references
    this.playerCharacterCollider = null
    this.playerDeskCollider = null
    this.otherPlayersGroup = null
    this.currentCollidingDesk = null

    this.scene = null
  }
}
