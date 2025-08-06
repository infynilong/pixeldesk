export class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, spriteKey = 'characters_list_image', enableMovement = true, enableStateSave = true) {
        // 尝试从存储中恢复位置（仅当启用状态保存时）
        let savedState = null;
        if (enableStateSave) {
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
        
        // 创建身体和头部精灵
        this.bodySprite = scene.add.image(0, 48, this.spriteKey);
        this.headSprite = scene.add.image(0, 0, this.spriteKey);
        
        this.add([this.headSprite, this.bodySprite]);
        
        // 设置纹理区域（从tileset中提取正确的帧）
        this.bodySprite.setFrame(56); // user_body对应的帧
        this.headSprite.setFrame(0);  // user_head对应的帧

        // 启用物理特性
        scene.physics.world.enable(this);
        // 修改碰撞体大小和偏移量，使其与玩家精灵重叠
        this.body.setSize(40, 60);
        this.body.setOffset(0, 0);
        
        // 设置默认帧
        this.setDirectionFrame(this.currentDirection);
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
    
    destroy() {
        if (this.bodySprite) this.bodySprite.destroy();
        if (this.headSprite) this.headSprite.destroy();
        super.destroy();
    }
}