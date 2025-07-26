export class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, spriteKey = 'characters_list_image') {
        super(scene, x, y);
        
        this.spriteKey = spriteKey;
        this.currentDirection = 'down';
        
        // 创建身体和头部精灵
        this.bodySprite = scene.add.image(0, 48, this.spriteKey);
        this.headSprite = scene.add.image(0, 0, this.spriteKey);
        
        this.add([this.headSprite, this.bodySprite]);
        
        // 设置纹理区域（从tileset中提取正确的帧）
        this.bodySprite.setFrame(56); // user_body对应的帧
        this.headSprite.setFrame(0);  // user_head对应的帧

        // 启用物理特性
        scene.physics.world.enable(this);
        this.body.setSize(32, 80);
        this.body.setOffset(-16, -32);
        
        // 设置默认帧
        // this.setDirectionFrame('down');
    }
    
    setDirectionFrame(direction) {
        if (this.currentDirection === direction) return;
        
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
    }
    
    move(velocityX, velocityY, direction) {
        if (!this.body) return;
        
        this.body.setVelocity(velocityX, velocityY);
        
        // 更新玩家方向帧（仅在移动时更新）
        if (velocityX !== 0 || velocityY !== 0) {
            this.setDirectionFrame(direction);
        }
    }
    
    destroy() {
        if (this.bodySprite) this.bodySprite.destroy();
        if (this.headSprite) this.headSprite.destroy();
        super.destroy();
    }
}