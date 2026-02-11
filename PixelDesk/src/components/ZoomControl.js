export class ZoomControl extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene);
        
        // 创建缩放控制按钮容器
        this.setScrollFactor(0); // 固定在屏幕上，不随摄像机移动
        this.setDepth(1000); // 确保在最上层显示
        
        // 注释掉按钮创建代码以减少不必要的DOM元素
        // // 创建按钮背景(圆形)
        // this.bg = scene.add.circle(0, 0, 25, 0x000000, 0.7);
        // this.bg.setOrigin(1, 0);
        
        // 添加阴影效果
        // this.bgShadow = scene.add.circle(3, 3, 25, 0x000000, 0.3);
        // this.bgShadow.setOrigin(1, 0);
        
        // 创建按钮文本
        // this.zoomInButton = scene.add.text(-15, -20, '+', {
        //     fontSize: '24px',
        //     fill: '#ffffff',
        //     fontStyle: 'bold'
        // });
        // this.zoomInButton.setOrigin(0.5);
        
        // this.zoomOutButton = scene.add.text(-15, 20, '-', {
        //     fontSize: '24px',
        //     fill: '#ffffff',
        //     fontStyle: 'bold'
        // });
        // this.zoomOutButton.setOrigin(0.5);
        
        // // 将所有元素添加到容器中
        // this.add([this.bgShadow, this.zoomInButton, this.zoomOutButton]);
        
        // // 设置按钮交互
        // this.zoomInButton.setInteractive({ useHandCursor: true });
        // this.zoomOutButton.setInteractive({ useHandCursor: true });
        
        // // 添加事件监听器
        // this.zoomInButton.on('pointerdown', () => {
        //     this.adjustZoom(0.1);
        // });
        
        // this.zoomOutButton.on('pointerdown', () => {
        //     this.adjustZoom(-0.1);
        // });
        
        // // 监听场景更新事件来持续定位控件
        // scene.events.on('postupdate', this.updatePosition, this);
        
        // // 将容器添加到场景中
        // scene.add.existing(this);
        
        // // 确保鼠标事件能正确传递到场景
        // this.setExclusive(false);
    }
    
    updatePosition() {
        const camera = this.scene.cameras.main;
        const scaleX = camera.scaleX;
        const scaleY = camera.scaleY;
        
        // 基于相机视图大小和缩放级别计算位置
        const width = this.scene.scale.width / scaleX;
        const height = this.scene.scale.height / scaleY;
        
        // 设置位置到右上角，考虑相机滚动位置
        this.setX(camera.scrollX + width - 10);
        this.setY(camera.scrollY + 10);
    }
    
    adjustZoom(delta) {
        // 调用CameraInputManager中的adjustZoom方法
        if (this.scene.cameraInput && this.scene.cameraInput.adjustZoom) {
            this.scene.cameraInput.adjustZoom(delta);
        }
    }
    
    destroy() {
        // 清理事件监听器
        this.scene.events.off('postupdate', this.updatePosition, this);
        super.destroy();
    }
}