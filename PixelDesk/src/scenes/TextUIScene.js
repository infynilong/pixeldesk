export class TextUIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TextUIScene' });
        this.deskCount = 0; // 添加桌子数量属性
        this.userData = null; // 用户数据
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

        // 监听用户数据更新事件
        if (gameScene) {
            gameScene.events.on('update-user-data', (data) => {
                this.userData = data;
                this.updateUserDisplay(data);
            });
        }
        
        // 从API获取工位统计信息
        this.fetchWorkstationStats();
        
        // 定期更新工位统计信息（每30秒）
        this.time.addEvent({
            delay: 30000,
            callback: this.fetchWorkstationStats,
            callbackScope: this,
            loop: true
        });
    }
    
    updateUserDisplay(data) {
        if (data && this.userInfoText) {
            const deskCount = data.deskCount || this.deskCount;
            const boundCount = data.boundCount || 0;
            
            let displayText = `工位总数: ${deskCount} | 已绑定: ${boundCount}`;
            
            this.userInfoText.setText(displayText);
            console.log('UI Updated - Desk count:', deskCount, 'Bound count:', boundCount);
        } else if (!this.userInfoText) {
            console.warn('userInfoText is not initialized yet');
        }
    }
    
    // 从Phaser游戏获取工位统计信息
    fetchWorkstationStats() {
        try {
            // 首先尝试从全局游戏实例获取工位统计
            if (typeof window !== 'undefined' && window.getGameWorkstationStats) {
                const stats = window.getGameWorkstationStats();
                this.updateUserDisplay({
                    deskCount: stats.totalWorkstations,
                    boundCount: stats.boundWorkstations
                });
                console.log('Got workstation stats from game:', stats);
                return;
            }
            
            // 备用方案：从API获取
            this.fetchWorkstationStatsFromAPI();
        } catch (error) {
            console.error('Failed to fetch workstation stats from game:', error);
            // 备用方案：从API获取
            this.fetchWorkstationStatsFromAPI();
        }
    }
    
    // 从API获取工位统计信息（备用方案）
    async fetchWorkstationStatsFromAPI() {
        try {
            const response = await fetch('/api/workstations/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const stats = data.data;
                    this.updateUserDisplay({
                        deskCount: stats.totalWorkstations,
                        boundCount: stats.boundWorkstations
                    });
                    console.log('Got workstation stats from API:', stats);
                }
            }
        } catch (error) {
            console.error('Failed to fetch workstation stats from API:', error);
        }
    }
    
    updateDeskCount(count) {
        console.log('updateDeskCount', count)
        this.deskCount = count;

        // 重新更新显示以包含桌子数量
        if (this.userData) {
            // 创建新的数据对象，包含更新的deskCount
            const updatedData = {
                ...this.userData,
                deskCount: count
            };
            this.updateUserDisplay(updatedData);
        } else {
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
    
    updateBoundCount(count) {
        // 更新已绑定工位数量
        if (this.userData) {
            const updatedData = {
                ...this.userData,
                boundCount: count
            };
            this.updateUserDisplay(updatedData);
        } else {
            const gameScene = this.scene.get('Start');
            if (gameScene.userData) {
                const updatedData = {
                    ...gameScene.userData,
                    boundCount: count
                };
                this.updateUserDisplay(updatedData);
            }
        }
    }
}