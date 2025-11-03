// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
  // 禁用控制台日志以大幅减少CPU消耗（开发时可设为true）
  ENABLE_DEBUG_LOGGING: false,
  // 关键错误和警告仍然显示
  ENABLE_ERROR_LOGGING: true
}

// 性能优化的日志系统
const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => {}
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => {}

export class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, spriteKey = 'characters_list_image', enableMovement = true, enableStateSave = true, isOtherPlayer = false, playerData = null) {
        // 尝试从存储中恢复位置（仅当启用状态保存时）
        let savedState = null;
        if (enableStateSave && !isOtherPlayer) {
            try {
                const state = localStorage.getItem('playerState');
                savedState = state ? JSON.parse(state) : null;
                if (savedState) {
                    x = savedState.x;
                    y = savedState.y;
                }
            } catch (e) {
                // 忽略localStorage错误
            }
        }
        
        super(scene, x, y);
        
        this.spriteKey = spriteKey;
        this.currentDirection = savedState?.direction || 'down';
        this.speed = 200;
        this.enableMovement = enableMovement;
        this.enableStateSave = enableStateSave;
        this.isOtherPlayer = isOtherPlayer;
        this.playerData = playerData || {
            id: Date.now(),
            name: isOtherPlayer ? '其他玩家' : '我',
            currentStatus: {
                type: 'working',
                status: '工作中',
                emoji: '💼',
                message: '正在工作中...',
                timestamp: new Date().toISOString()
            }
        };

        // 初始化数据库保存相关的定时器（用于较低频率的数据库同步）
        this.dbSaveTimer = null;
        this.lastDbSave = 0;
        this.dbSaveInterval = 5000; // 每5秒保存一次到数据库

        // 初始化碰撞检测状态
        this.isColliding = false;
        this.collisionStartTime = null;
        this.collisionDebounceTimer = null;
        
        // 创建身体和头部精灵
        this.bodySprite = scene.add.image(0, 48, this.spriteKey);
        this.headSprite = scene.add.image(0, 0, this.spriteKey);
        
        this.add([this.headSprite, this.bodySprite]);
        
        // 设置纹理区域（从tileset中提取正确的帧）
        this.bodySprite.setFrame(56); // user_body对应的帧
        this.headSprite.setFrame(0);  // user_head对应的帧

        // 启用物理特性
        scene.physics.world.enable(this);

        // 初始化角色浮动动画（必须在物理体创建后）
        // 仅为其他玩家启用浮动动画，主玩家不启用
        if (this.isOtherPlayer) {
            this.initCharacterFloatAnimation();
        }
        // 修改碰撞体大小和偏移量，使其与玩家精灵重叠
        this.body.setSize(40, 60);
        this.body.setOffset(-20, -12);
        
        // 设置默认帧
        this.setDirectionFrame(this.currentDirection);
        
        // 为其他玩家创建状态标签
        if (this.isOtherPlayer) {
            this.createStatusLabel();
            // 为其他玩家添加点击检测
            this.setupClickDetection();
        }
    }
    
    setDirectionFrame(direction) {
        this.currentDirection = direction;
        
        // 根据方向设置不同的帧（假设帧布局）
        switch (direction) {
            case 'up':
                this.headSprite.setFrame(1);
                this.bodySprite.setFrame(57);
                break;
            case 'left':
                this.headSprite.setFrame(2);
                this.bodySprite.setFrame(58);
                break;
            case 'down': 
                this.headSprite.setFrame(3);
                this.bodySprite.setFrame(59);
                break;
            case 'right':
                this.headSprite.setFrame(0);
                this.bodySprite.setFrame(56);
                break;
        }
        
        // 保存方向变化
        this.saveState();
    }
    
    move(velocityX, velocityY, direction) {
        if (!this.body) return;
        
        this.body.setVelocity(velocityX, velocityY);
        
        // 更新玩家方向帧（仅在移动时更新）
        if (velocityX !== 0 || velocityY !== 0) {
            this.setDirectionFrame(direction);
        }
    }
    
    // 新增：处理玩家移动逻辑
    handleMovement(cursors, wasdKeys) {
        // 如果移动功能被禁用，直接返回
        if (!this.enableMovement) {
            return;
        }

        let velocityX = 0;
        let velocityY = 0;
        let direction = this.currentDirection; // 保持当前方向

        // 检查水平移动
        if (cursors.left.isDown || wasdKeys.A.isDown) {
            velocityX = -this.speed;
            direction = 'left';
        } else if (cursors.right.isDown || wasdKeys.D.isDown) {
            velocityX = this.speed;
            direction = 'right';
        }

        // 检查垂直移动
        if (cursors.up.isDown || wasdKeys.W.isDown) {
            velocityY = -this.speed;
            direction = 'up';
        } else if (cursors.down.isDown || wasdKeys.S.isDown) {
            velocityY = this.speed;
            direction = 'down';
        }

        // 设置速度和方向
        this.move(velocityX, velocityY, direction);
        
        // 保存位置（在移动过程中持续保存）
        if (velocityX !== 0 || velocityY !== 0) {
            this.saveState();
        }
    }
    
    // 保存玩家状态到localStorage - 优化防抖以大幅减少CPU消耗
    saveState() {
        // 如果状态保存功能被禁用，直接返回
        if (!this.enableStateSave) {
            return;
        }

        // 高效防抖机制：只在没有pending timer时才创建，避免每帧clearTimeout操作
        // 保存到 localStorage（高频率，200ms防抖）
        if (!this.saveStateTimer) {
            this.saveStateTimer = setTimeout(() => {
                const state = {
                    x: this.x,
                    y: this.y,
                    direction: this.currentDirection
                };
                localStorage.setItem('playerState', JSON.stringify(state));
                this.saveStateTimer = null;
            }, 200); // 200ms防抖延迟
        }

        // 🔧 性能优化：禁用数据库保存，避免频繁HTTP请求消耗CPU
        // 玩家位置已保存到localStorage，数据库同步不是必需的
        // 保存到数据库（低频率，每5秒）- 已禁用
        // const now = Date.now();
        // if (now - this.lastDbSave > this.dbSaveInterval && !this.dbSaveTimer) {
        //     this.dbSaveTimer = setTimeout(async () => {
        //         // ... 数据库保存代码已禁用
        //     }, 100);
        // }
    }
    
    // 从localStorage获取保存的玩家状态
    getSavedState() {
        try {
            const state = localStorage.getItem('playerState');
            return state ? JSON.parse(state) : null;
        } catch (e) {
            debugWarn('Failed to parse player state from localStorage', e);
            return null;
        }
    }

    // 清除保存的玩家状态
    clearSavedState() {
        localStorage.removeItem('playerState');
    }
    
    // 创建状态标签
    createStatusLabel() {
        const status = this.playerData.currentStatus;
        this.statusLabel = this.scene.add.text(
            0, 
            -20, 
            `${status.emoji} ${status.status}`, 
            {
                fontSize: '12px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 4, y: 2 }
            }
        ).setOrigin(0.5);
        
        this.add(this.statusLabel);
        
        // 初始化浮动动画
        this.initFloatingAnimation();
        
        // 初始化可视范围检测
        this.initVisibilityCheck();
    }
    
    // 初始化角色浮动动画
    initCharacterFloatAnimation() {
        // 为每个角色生成随机的浮动参数，创造不同的浮动节奏
        const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 到 1.3 的随机因子
        
        // 角色浮动动画参数（大幅减少动画频率以节省CPU）
        this.characterFloatAmplitude = 1.2 + Math.random() * 0.6;   // 浮动幅度：1.2 到 1.8 像素
        this.characterFloatInterval = 8000 + Math.random() * 4000;   // 浮动间隔：8到12秒（原来1.8-2.6秒）
        this.characterFloatDuration = 800 + Math.random() * 400;    // 单次浮动持续时间：800 到 1200 毫秒
        
        // 记录角色的初始Y位置
        this.characterBaseY = this.y;
        
        // 启动周期性浮动动画
        this.startPeriodicFloatAnimation();
    }
    
    // 启动周期性浮动动画
    startPeriodicFloatAnimation() {
        // 清除之前的计时器（如果有）
        if (this.floatTimer) {
            this.floatTimer.remove();
        }
        
        // 创建周期性浮动计时器
        this.floatTimer = this.scene.time.addEvent({
            delay: this.characterFloatInterval,
            callback: this.performFloatAnimation,
            callbackScope: this,
            loop: true
        });
        
        // 立即执行第一次浮动
        this.performFloatAnimation();
    }
    
    // 停止浮动动画
    stopFloatAnimation() {
        // 停止所有浮动相关的tweens
        this.scene.tweens.killTweensOf(this);
        
        // 停止周期性计时器
        if (this.floatTimer) {
            this.floatTimer.remove();
            this.floatTimer = null;
        }
        
        // 重置到基准位置
        if (this.characterBaseY !== undefined) {
            this.y = this.characterBaseY;
            if (this.body) {
                this.body.y = this.characterBaseY;
            }
        }
    }
    
    // 执行单次浮动动画
    performFloatAnimation() {
        if (!this.body || this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            return;
        }
        
        // 记录动画开始时的基准位置
        const originalBaseY = this.characterBaseY;
        
        // 创建浮动动画
        this.scene.tweens.add({
            targets: this,
            y: this.characterBaseY - this.characterFloatAmplitude,
            duration: this.characterFloatDuration / 2,
            ease: 'Sine.easeOut',
            yoyo: true,
            onUpdate: () => {
                // 如果玩家开始移动，立即停止动画
                if (this.body && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
                    this.scene.tweens.killTweensOf(this);
                    this.y = originalBaseY;
                    if (this.body) {
                        this.body.y = originalBaseY;
                    }
                    return;
                }
                
                // 同步更新物理体位置
                if (this.body) {
                    this.body.y = this.y;
                }
            },
            onComplete: () => {
                // 动画完成后重置到基准位置，但只在玩家仍然静止时
                if (this.body && this.body.velocity.x === 0 && this.body.velocity.y === 0) {
                    this.y = originalBaseY;
                    this.body.y = originalBaseY;
                }
            }
        });
    }
    
    // 初始化浮动动画 - 使用Tween而不是每帧更新
    initFloatingAnimation() {
        if (!this.statusLabel) return;
        
        // 浮动动画参数
        this.floatingAmplitude = 3; // 浮动幅度
        
        // 初始Y位置
        this.baseY = this.statusLabel.y;
        
        // 使用Tween创建循环浮动动画，比每帧更新更高效
        this.floatingTween = this.scene.tweens.add({
            targets: this.statusLabel,
            y: this.baseY - this.floatingAmplitude,
            duration: 1500 + Math.random() * 500, // 随机化持续时间避免同步
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            paused: !this.isVisible // 只有可见时才开始动画
        });
    }
    
    // 控制动画播放/暂停以优化性能
    controlFloatingAnimation(shouldPlay) {
        if (this.floatingTween) {
            if (shouldPlay && this.floatingTween.paused) {
                this.floatingTween.resume();
            } else if (!shouldPlay && !this.floatingTween.paused) {
                this.floatingTween.pause();
            }
        }
    }
    
    // 初始化可视范围检测 - 使用定时器而不是每帧检查
    initVisibilityCheck() {
        this.isVisible = true;
        this.visibilityDebounceTimer = null; // 防抖计时器
        
        // 进一步优化：将可见性检查频率从1秒减少到5秒，减少CPU占用
        this.visibilityTimer = this.scene.time.addEvent({
            delay: 5000, // 改为每5秒检查一次，进一步减少CPU使用
            callback: this.checkVisibility,
            callbackScope: this,
            loop: true
        });
    }
    
    // 检查可视范围 - 优化后的版本
    checkVisibility() {
        if (!this.isOtherPlayer || !this.statusLabel) return;
        
        // 安全检查：确保scene和cameras存在
        if (!this.scene || !this.scene.cameras) return;
        
        // 获取相机边界
        const camera = this.scene.cameras.main;
        const cameraLeft = camera.worldView.left;
        const cameraRight = camera.worldView.right;
        const cameraTop = camera.worldView.top;
        const cameraBottom = camera.worldView.bottom;
        
        // 扩展检测范围（在屏幕外一定距离内也显示）
        const padding = 100;
        
        // 检查玩家是否在可视范围内
        const wasVisible = this.isVisible;
        this.isVisible = (
            this.x >= cameraLeft - padding &&
            this.x <= cameraRight + padding &&
            this.y >= cameraTop - padding &&
            this.y <= cameraBottom + padding
        );
        
        // 优化：只有在可视性发生变化时才更新
        if (wasVisible !== this.isVisible) {
            // 清除之前的防抖计时器
            if (this.visibilityDebounceTimer) {
                this.scene.time.removeEvent(this.visibilityDebounceTimer);
            }
            
            // 设置防抖计时器，避免快速闪烁
            this.visibilityDebounceTimer = this.scene.time.delayedCall(100, () => {
                this.statusLabel.setVisible(this.isVisible);
                
                // 控制浮动动画的播放/暂停以优化性能
                this.controlFloatingAnimation(this.isVisible);
                
                this.visibilityDebounceTimer = null;
            });
        }
    }
    
    // 更新状态
    updateStatus(newStatus) {
        this.playerData.currentStatus = newStatus;
        if (this.statusLabel) {
            this.statusLabel.setText(`${newStatus.emoji} ${newStatus.status}`);
        }
    }
    
    // 设置点击检测
    setupClickDetection() {
        // 设置整个容器为可交互
        this.setInteractive(new Phaser.Geom.Rectangle(-20, -30, 40, 60), Phaser.Geom.Rectangle.Contains);
        
        // 添加点击事件监听器
        this.on('pointerdown', (pointer) => {
            // 只有其他玩家才能被点击
            if (this.isOtherPlayer) {
                this.handlePlayerClick(pointer);
            }
        });
        
        // 添加悬停效果
        this.on('pointerover', () => {
            if (this.isOtherPlayer) {
                // 添加悬停效果
                this.setAlpha(0.8);
                this.scene.input.setDefaultCursor('pointer');
            }
        });
        
        this.on('pointerout', () => {
            if (this.isOtherPlayer) {
                // 恢复正常状态
                this.setAlpha(1);
                this.scene.input.setDefaultCursor('default');
            }
        });
    }
    
    // 处理玩家点击
    handlePlayerClick(pointer) {
        debugLog('玩家被点击:', this.playerData.name);

        // 获取主玩家数据，确保有完整的格式
        const mainPlayerData = this.scene.player?.playerData || {
            id: 'temp',
            name: '我',
            currentStatus: {
                type: 'working',
                status: '工作中',
                emoji: '💼',
                message: '',
                timestamp: new Date().toISOString()
            },
            isOnline: true
        };

        // 创建独立的点击事件
        const clickEvent = {
            type: 'player_click',
            targetPlayer: this.playerData,
            mainPlayer: mainPlayerData,
            timestamp: Date.now(),
            position: { x: this.x, y: this.y },
            trigger: 'click'
        };

        // 使用事件总线触发点击事件 - 独立处理，不与碰撞混淆
        if (window.gameEventBus) {
            debugLog('触发玩家点击事件:', clickEvent);
            window.gameEventBus.emit('player:click', clickEvent);
        }

        // 添加点击动画效果
        this.addClickAnimation();
    }
    
    // 添加点击动画效果
    addClickAnimation() {
        // 缩放动画 - 点击时更明显的效果
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 120,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.setScale(1);
            }
        });
        
        // 蓝色闪烁效果 - 区别于碰撞的粉色效果
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            ease: 'Power2'
        });
        
        // 添加蓝色光环效果表示点击交互
        const clickRing = this.scene.add.graphics();
        clickRing.lineStyle(3, 0x00BFFF, 0.8); // 蓝色光环
        clickRing.strokeCircle(this.x, this.y, 30);
        
        // 光环扩散动画
        this.scene.tweens.add({
            targets: clickRing,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                clickRing.destroy();
            }
        });
    }
    
    // 添加碰撞动画效果 - 区别于点击动画
    addCollisionAnimation() {
        // 轻微的脉冲效果
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 300,
            yoyo: true,
            ease: 'Sine.easeInOut',
            repeat: -1, // 持续脉冲直到碰撞结束
            onComplete: () => {
                this.setScale(1);
            }
        });
        
        // 粉色光环效果表示碰撞交互
        const collisionRing = this.scene.add.graphics();
        collisionRing.lineStyle(2, 0xFF69B4, 0.6); // 粉色光环
        collisionRing.strokeCircle(this.x, this.y, 25);
        
        // 持续的光环脉冲动画
        this.collisionRing = collisionRing; // 保存引用以便在碰撞结束时清理
        this.scene.tweens.add({
            targets: collisionRing,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            ease: 'Sine.easeInOut',
            repeat: -1 // 持续动画
        });
    }
    
    // 清理碰撞动画效果
    clearCollisionAnimation() {
        // 检查场景是否存在且有效
        if (!this.scene || !this.scene.tweens) {
            debugWarn('Scene or tweens not available, skipping collision animation cleanup');
            // 至少重置缩放
            if (this.setScale) {
                this.setScale(1);
            }
            return;
        }
        
        try {
            // 停止所有针对此对象的缩放动画
            this.scene.tweens.killTweensOf(this);
            this.setScale(1);
            
            // 清理碰撞光环
            if (this.collisionRing) {
                this.scene.tweens.killTweensOf(this.collisionRing);
                this.collisionRing.destroy();
                this.collisionRing = null;
            }
        } catch (error) {
            debugWarn('Error clearing collision animation:', error);
            // 至少重置缩放
            if (this.setScale) {
                this.setScale(1);
            }
        }
    }
    
    // 处理与主玩家的碰撞开始
    handleCollisionStart(mainPlayer) {
        if (this.isOtherPlayer && !this.isColliding) {
            this.isColliding = true;
            this.collisionStartTime = Date.now();
            
            // 创建碰撞事件数据
            const collisionEvent = {
                type: 'collision_start',
                mainPlayer: mainPlayer.playerData,
                targetPlayer: this.playerData,
                timestamp: this.collisionStartTime,
                position: { x: this.x, y: this.y }
            };
            
            // 使用事件总线触发碰撞开始事件
            if (window.gameEventBus) {
                window.gameEventBus.emit('player:collision:start', collisionEvent);
            }
            
            // 保持向后兼容性
            if (window.onPlayerCollisionStart) {
                window.onPlayerCollisionStart(collisionEvent);
            }
            
            debugLog('碰撞开始:', this.playerData.name, 'at', new Date(this.collisionStartTime).toLocaleTimeString());
        }
    }
    
    // 处理与主玩家的碰撞结束
    handleCollisionEnd(mainPlayer) {
        if (this.isOtherPlayer && this.isColliding) {
            this.isColliding = false;
            const collisionEndTime = Date.now();
            const collisionDuration = collisionEndTime - (this.collisionStartTime || collisionEndTime);
            
            // 创建碰撞结束事件数据
            const collisionEvent = {
                type: 'collision_end',
                mainPlayer: mainPlayer.playerData,
                targetPlayer: this.playerData,
                timestamp: collisionEndTime,
                duration: collisionDuration,
                position: { x: this.x, y: this.y }
            };
            
            // 使用事件总线触发碰撞结束事件
            if (window.gameEventBus) {
                window.gameEventBus.emit('player:collision:end', collisionEvent);
            }
            
            // 保持向后兼容性
            if (window.onPlayerCollisionEnd) {
                window.onPlayerCollisionEnd(collisionEvent);
            }
            
            // 清理碰撞动画效果
            this.clearCollisionAnimation();
            
            debugLog('碰撞结束:', this.playerData.name, '持续时间:', collisionDuration + 'ms');
            this.collisionStartTime = null;
        }
    }
    
    // 处理与主玩家的碰撞（保持向后兼容）
    handleCollisionWithMainPlayer(mainPlayer) {
        // 保持原有的碰撞处理逻辑以确保向后兼容
        if (this.isOtherPlayer && window.onPlayerCollision) {
            window.onPlayerCollision(this.playerData);
        }
        
        // 同时触发新的碰撞开始事件
        this.handleCollisionStart(mainPlayer);
    }
    
    // 禁用玩家移动
    disableMovement() {
        debugLog('Player.disableMovement() 被调用，当前enableMovement值:', this.enableMovement);
        this.enableMovement = false;
        debugLog('Player.disableMovement() 执行完成，新的enableMovement值:', this.enableMovement);
        // 停止当前移动
        if (this.body) {
            this.body.setVelocity(0, 0);
        }
    }
    
    // 启用玩家移动
    enableMovement() {
        debugLog('Player.enableMovement() 被调用，当前enableMovement值:', this.enableMovement);
        this.enableMovement = true;
        debugLog('Player.enableMovement() 执行完成，新的enableMovement值:', this.enableMovement);
    }

    // 传送玩家到指定位置
    teleportTo(x, y, direction = 'down') {
        if (!this.scene || !this.body) return false;
        
        // 停止当前移动
        if (this.body.velocity) {
            this.body.velocity.x = 0;
            this.body.velocity.y = 0;
        }
        
        // 设置新位置
        this.setPosition(x, y);
        
        // 设置朝向
        this.setDirectionFrame(direction);
        
        // 确保移动功能启用
        this.enableMovement = true;
        
        // 保存状态
        this.saveState();
        
        // 添加传送特效
        this.addTeleportEffect();
        
        debugLog(`玩家传送到位置: (${x}, ${y}), 朝向: ${direction}, 移动功能已启用`);
        return true;
    }

    // 添加传送特效
    addTeleportEffect() {
        // 创建传送特效
        const effect = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            quantity: 10,
            frequency: 100
        });
        
        // 1秒后销毁特效
        this.scene.time.delayedCall(1000, () => {
            effect.destroy();
        });
    }
    
    destroy() {
        // 清理状态保存防抖计时器
        if (this.saveStateTimer) {
            clearTimeout(this.saveStateTimer);
            this.saveStateTimer = null;
        }

        // 清理数据库保存计时器
        if (this.dbSaveTimer) {
            clearTimeout(this.dbSaveTimer);
            this.dbSaveTimer = null;
        }

        // 清理浮动计时器
        if (this.floatTimer) {
            this.floatTimer.remove();
        }

        // 清理可视性检查定时器
        if (this.visibilityTimer) {
            this.visibilityTimer.remove();
        }

        // 清理浮动动画Tween
        if (this.floatingTween) {
            this.floatingTween.destroy();
        }

        // 清理防抖计时器
        if (this.visibilityDebounceTimer) {
            this.scene.time.removeEvent(this.visibilityDebounceTimer);
        }

        // 清理碰撞防抖计时器
        if (this.collisionDebounceTimer) {
            this.scene.time.removeEvent(this.collisionDebounceTimer);
        }
        
        // 清理精灵
        if (this.bodySprite) this.bodySprite.destroy();
        if (this.headSprite) this.headSprite.destroy();
        if (this.statusLabel) this.statusLabel.destroy();
        
        super.destroy();
    }
}