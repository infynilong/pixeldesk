export class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, spriteKey = 'characters_list_image', enableMovement = true, enableStateSave = true, isOtherPlayer = false, playerData = null) {
        // 尝试从存储中恢复位置（仅当启用状态保存时）
        let savedState = null;
        if (enableStateSave && !isOtherPlayer) {
            savedState = Player.getSavedState();
            if (savedState) {
                x = savedState.x;
                y = savedState.y;
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
        this.initCharacterFloatAnimation();
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
    
    // 保存玩家状态到localStorage
    saveState() {
        // 如果状态保存功能被禁用，直接返回
        if (!this.enableStateSave) {
            return;
        }

        const state = {
            x: this.x,
            y: this.y,
            direction: this.currentDirection
        };
        localStorage.setItem('playerState', JSON.stringify(state));
    }
    
    // 从localStorage获取保存的玩家状态
    static getSavedState() {
        try {
            const state = localStorage.getItem('playerState');
            return state ? JSON.parse(state) : null;
        } catch (e) {
            console.warn('Failed to parse player state from localStorage', e);
            return null;
        }
    }
    
    // 清除保存的玩家状态
    static clearSavedState() {
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
        
        // 角色浮动动画参数（每个角色都有不同的节奏）
        this.characterFloatAmplitude = 1.2 + Math.random() * 0.6;   // 浮动幅度：1.2 到 1.8 像素
        this.characterFloatInterval = 1800 + Math.random() * 800;   // 浮动间隔：1800 到 2600 毫秒
        this.characterFloatDuration = 600 + Math.random() * 400;    // 单次浮动持续时间：600 到 1000 毫秒
        
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
    
    // 执行单次浮动动画
    performFloatAnimation() {
        if (!this.body || this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            return;
        }
        
        // 创建浮动动画
        this.scene.tweens.add({
            targets: this,
            y: this.characterBaseY - this.characterFloatAmplitude,
            duration: this.characterFloatDuration / 2,
            ease: 'Sine.easeOut',
            yoyo: true,
            onUpdate: () => {
                // 同步更新物理体位置
                if (this.body) {
                    this.body.y = this.y;
                }
            },
            onComplete: () => {
                // 动画完成后重置到基准位置
                this.y = this.characterBaseY;
                if (this.body) {
                    this.body.y = this.characterBaseY;
                }
            }
        });
    }
    
    // 初始化浮动动画
    initFloatingAnimation() {
        if (!this.statusLabel) return;
        
        // 浮动动画参数
        this.floatingAmplitude = 3; // 浮动幅度
        this.floatingSpeed = 0.002; // 浮动速度
        this.floatingOffset = 0; // 当前浮动偏移
        
        // 初始Y位置
        this.baseY = this.statusLabel.y;
        
        // 启动浮动动画
        this.scene.events.on('update', this.updateFloatingAnimation, this);
    }
    
    // 更新浮动动画
    updateFloatingAnimation() {
        if (!this.statusLabel || !this.isVisible) return;
        
        // 计算浮动偏移
        this.floatingOffset += this.floatingSpeed;
        const floatY = Math.sin(this.floatingOffset) * this.floatingAmplitude;
        
        // 应用浮动效果
        this.statusLabel.y = this.baseY + floatY;
    }
    
    // 初始化可视范围检测
    initVisibilityCheck() {
        this.isVisible = true;
        this.lastCheckTime = 0;
        this.checkInterval = 200; // 每200ms检查一次可视性
        
        // 监听相机移动事件
        this.scene.events.on('update', this.checkVisibility, this);
    }
    
    // 检查可视范围
    checkVisibility() {
        if (!this.isOtherPlayer || !this.statusLabel) return;
        
        const currentTime = Date.now();
        if (currentTime - this.lastCheckTime < this.checkInterval) return;
        
        this.lastCheckTime = currentTime;
        
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
            this.statusLabel.setVisible(this.isVisible);
            
            // 如果重新进入可视范围，重置浮动动画
            if (this.isVisible && !wasVisible) {
                this.floatingOffset = 0;
            }
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
        console.log('玩家被点击:', this.playerData.name);
        
        // 触发全局回调函数
        if (window.onPlayerClick) {
            window.onPlayerClick(this.playerData);
        }
        
        // 添加点击动画效果
        this.addClickAnimation();
    }
    
    // 添加点击动画效果
    addClickAnimation() {
        // 缩放动画
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.setScale(1);
            }
        });
        
        // 闪烁效果
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
    }
    
    // 处理与主玩家的碰撞
    handleCollisionWithMainPlayer(mainPlayer) {
        if (this.isOtherPlayer && window.onPlayerCollision) {
            window.onPlayerCollision(this.playerData);
        }
    }
    
    // 禁用玩家移动
    disableMovement() {
        console.log('Player.disableMovement() 被调用，当前enableMovement值:', this.enableMovement);
        this.enableMovement = false;
        console.log('Player.disableMovement() 执行完成，新的enableMovement值:', this.enableMovement);
        // 停止当前移动
        if (this.body) {
            this.body.setVelocity(0, 0);
        }
    }
    
    // 启用玩家移动
    enableMovement() {
        console.log('Player.enableMovement() 被调用，当前enableMovement值:', this.enableMovement);
        this.enableMovement = true;
        console.log('Player.enableMovement() 执行完成，新的enableMovement值:', this.enableMovement);
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
        
        // 保存状态
        this.saveState();
        
        // 添加传送特效
        this.addTeleportEffect();
        
        console.log(`玩家传送到位置: (${x}, ${y}), 朝向: ${direction}`);
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
        // 清理事件监听器
        if (this.scene) {
            this.scene.events.off('update', this.updateFloatingAnimation, this);
            this.scene.events.off('update', this.checkVisibility, this);
        }
        
        // 清理浮动计时器
        if (this.floatTimer) {
            this.floatTimer.remove();
        }
        
        // 清理精灵
        if (this.bodySprite) this.bodySprite.destroy();
        if (this.headSprite) this.headSprite.destroy();
        if (this.statusLabel) this.statusLabel.destroy();
        
        super.destroy();
    }
}