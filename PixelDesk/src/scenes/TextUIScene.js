export class TextUIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TextUIScene' });
        this.deskCount = 0; // 添加桌子数量属性
    }
    
    create() {
      
        // 2. 用户信息栏 (userInfo)
        const infoBarHeight = 40;
        const fontSize = '18px';

        this.userInfoBg = this.add.rectangle(
            this.scale.width / 2, 
            infoBarHeight / 2, 
            this.scale.width, 
            infoBarHeight, 
            0x000000, 0.6
        );
        this.userInfoBg.setScrollFactor(0).setDepth(999);
        
        this.userInfoText = this.add.text(
            this.scale.width / 2, 
            infoBarHeight / 2, 
            'Loading...', 
            {
                fontSize: fontSize,
                fill: '#ffffff',
                align: 'center'
            }
        );
        this.userInfoText.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1000);
        
        // 监听游戏数据更新事件
        const gameScene = this.scene.get('Start');

        // 立即使用初始数据更新一次
        if (gameScene.userData) {
            this.updateUserDisplay(gameScene.userData);
        }
    }
    
    updateUserDisplay(data) {
        if (data) {
            this.userInfoText.setText(
                `${data.username} | Desks: ${data.deskCount}`
            );
        }
    }
    
    updateDeskCount(count) {
        console.log('updateDeskCount', count)
        this.deskCount = count;

        // 重新更新显示以包含桌子数量
        const gameScene = this.scene.get('Start');
        if (gameScene.userData) {
            // 创建新的数据对象，包含更新的deskCount
            const updatedData = {
                ...gameScene.userData,
                deskCount: count
            };
            this.updateUserDisplay(updatedData);
        }
    }
}