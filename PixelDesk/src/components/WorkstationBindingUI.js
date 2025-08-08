import { Player } from '../entities/Player.js';

export class WorkstationBindingUI {
    constructor(scene) {
        this.scene = scene;
        this.bindingWindow = null;
        this.isVisible = false;
        this.currentWorkstation = null;
    }

    show(workstation, user) {
        if (this.isVisible) return;

        this.currentWorkstation = workstation;
        this.currentuser = user;
        this.createBindingWindow();
        this.isVisible = true;
    }

    hide() {
        if (!this.isVisible) return;

        if (this.bindingWindow) {
            this.bindingWindow.destroy();
            this.bindingWindow = null;
        }
        this.isVisible = false;
        this.currentWorkstation = null;
    }

    createBindingWindow() {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        // 创建半透明背景
        const bg = this.scene.add.rectangle(
            centerX,
            centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000,
            0.6
        );
        bg.setScrollFactor(0);
        bg.setDepth(999); // 背景在按钮下方

        // 创建绑定窗口
        const windowBg = this.scene.add.rectangle(
            centerX,
            centerY,
            400,
            250,
            0x2a2a2a,
            0.95
        );
        windowBg.setScrollFactor(0);
        windowBg.setStrokeStyle(2, 0x4a9eff);
        windowBg.setDepth(999); // 窗口在按钮下方

        // 标题
        const title = this.scene.add.text(
            centerX,
            centerY - 80,
            '工位绑定',
            {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1001); // 文本在按钮上方

        // 工位信息
        const infoText = this.scene.add.text(
            centerX,
            centerY - 40,
            `工位ID: ${this.currentWorkstation.id}\n位置: (${Math.floor(this.currentWorkstation.position.x)}, ${Math.floor(this.currentWorkstation.position.y)})\n类型: ${this.currentWorkstation.type}`,
            {
                fontSize: '16px',
                fill: '#cccccc',
                fontFamily: 'Arial',
                align: 'center'
            }
        );
        infoText.setOrigin(0.5);
        infoText.setScrollFactor(0);
        infoText.setDepth(1001); // 文本在按钮上方

        // 费用信息
        const costText = this.scene.add.text(
            centerX,
            centerY + 20,
            '绑定费用: 5积分 (30天)',
            {
                fontSize: '18px',
                fill: '#ffd700',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        costText.setOrigin(0.5);
        costText.setScrollFactor(0);
        costText.setDepth(1001); // 文本在按钮上方

        // 用户积分
        this.userPointsText = this.scene.add.text(
            centerX,
            centerY + 50,
            `您的积分: ${this.currentuser.points}`,
            {
                fontSize: '16px',
                fill: '#4a9eff',
                fontFamily: 'Arial'
            }
        );
        this.userPointsText.setOrigin(0.5);
        this.userPointsText.setScrollFactor(0);
        this.userPointsText.setDepth(1001); // 文本在按钮上方

        // 创建按钮
        const buttons = this.createButtons(centerX, centerY + 90);

        // 存储窗口组件
        this.bindingWindow = this.scene.add.container(0, 0, [
            bg, windowBg, title, infoText, costText, userPointsText, ...buttons
        ]);
        this.bindingWindow.setScrollFactor(0);
        this.bindingWindow.setDepth(1000); // 容器深度
    }

    createButtons(centerX, centerY) {
        // 确认按钮
        const confirmButton = this.scene.add.rectangle(
            centerX - 80,
            centerY,
            120,
            40,
            0x4a9eff
        );
        confirmButton.setScrollFactor(0);
        confirmButton.setInteractive();
        confirmButton.setDepth(1000); // 确保按钮在最上层

        const confirmText = this.scene.add.text(
            centerX - 80,
            centerY,
            '确认绑定',
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        confirmText.setOrigin(0.5);
        confirmText.setScrollFactor(0);
        confirmText.setDepth(1001); // 文本在按钮上方

        // 取消按钮
        const cancelButton = this.scene.add.rectangle(
            centerX + 80,
            centerY,
            120,
            40,
            0x666666
        );
        cancelButton.setScrollFactor(0);
        cancelButton.setInteractive();
        cancelButton.setDepth(1000); // 确保按钮在最上层

        const cancelText = this.scene.add.text(
            centerX + 80,
            centerY,
            '取消',
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        cancelText.setOrigin(0.5);
        cancelText.setScrollFactor(0);
        cancelText.setDepth(1001); // 文本在按钮上方

        // 按钮事件
        confirmButton.on('pointerdown', () => {
            console.log('确认按钮被点击');
            this.handleConfirm();
        });
        confirmButton.on('pointerover', () => confirmButton.setFillStyle(0x5aafff));
        confirmButton.on('pointerout', () => confirmButton.setFillStyle(0x4a9eff));

        cancelButton.on('pointerdown', () => {
            console.log('取消按钮被点击');
            this.handleCancel();
        });
        cancelButton.on('pointerover', () => cancelButton.setFillStyle(0x777777));
        cancelButton.on('pointerout', () => cancelButton.setFillStyle(0x666666));

        // 返回按钮组件数组
        return [confirmButton, confirmText, cancelButton, cancelText];
    }

    async handleConfirm() {
        try {
            const result = await this.scene.workstationManager.purchaseWorkstation(
                this.currentWorkstation.id,
                this.currentuser.id,
                this.currentuser
            );

            if (result.success) {
                // 更新用户积分
                this.currentuser.points = result.remainingPoints;
                
                // 更新UI显示
                if (this.userPointsText) {
                    this.userPointsText.setText(`您的积分: ${result.remainingPoints}`);
                }
                
                // 保存用户数据
                localStorage.setItem('pixelDeskUser', JSON.stringify(this.currentuser));
                
                // 显示成功消息
                this.showMessage('绑定成功！', 0x4a9eff);
                
                // 更新场景中的积分显示
                this.scene.events.emit('user-points-updated', {
                    userId: this.currentuser.id,
                    points: result.remainingPoints
                });
                
                // 延迟关闭窗口
                setTimeout(() => {
                    // 保存scene引用，防止hide()方法影响
                    const sceneRef = this.scene;
                    const playerRef = this.scene?.player;
                    
                    // 先尝试立即恢复玩家移动
                    if (playerRef) {
                        console.log('WorkstationBindingUI: 确认成功 - 找到player对象，尝试恢复移动');
                        // 如果enableMovement是属性，直接设置
                        if (typeof playerRef.enableMovement !== 'function') {
                            playerRef.enableMovement = true;
                            console.log('WorkstationBindingUI: 确认成功 - 已设置enableMovement属性为true');
                        }
                        // 如果enableMovement是方法，调用它
                        else if (typeof playerRef.enableMovement === 'function') {
                            playerRef.enableMovement();
                            console.log('WorkstationBindingUI: 确认成功 - 已调用enableMovement方法');
                        }
                    }
                    
                    this.hide();
                    
                    // 使用延迟调用作为确保恢复的备选方案
                    if (sceneRef) {
                        sceneRef.time.delayedCall(50, () => {
                            console.log('WorkstationBindingUI: 确认成功 - 延迟调用尝试恢复玩家移动');
                            
                            // 方法1：尝试直接访问scene.player
                            if (sceneRef.player) {
                                console.log('WorkstationBindingUI: 确认成功 - 延迟调用找到scene.player');
                                // 如果enableMovement是属性，直接设置
                                if (typeof sceneRef.player.enableMovement !== 'function') {
                                    sceneRef.player.enableMovement = true;
                                    console.log('WorkstationBindingUI: 确认成功 - 延迟调用已设置enableMovement属性为true');
                                }
                                // 如果enableMovement是方法，调用它
                                else if (typeof sceneRef.player.enableMovement === 'function') {
                                    sceneRef.player.enableMovement();
                                    console.log('WorkstationBindingUI: 确认成功 - 延迟调用已调用enableMovement方法');
                                }
                            }
                            // 方法2：尝试通过scene.children.list查找player对象
                            else if (sceneRef.children && sceneRef.children.list) {
                                console.log('WorkstationBindingUI: 确认成功 - 延迟调用尝试在children中查找Player对象');
                                const playerInChildren = sceneRef.children.list.find(child => child instanceof Player);
                                if (playerInChildren) {
                                    console.log('WorkstationBindingUI: 确认成功 - 延迟调用在children中找到Player实例');
                                    // 如果enableMovement是属性，直接设置
                                    if (typeof playerInChildren.enableMovement !== 'function') {
                                        playerInChildren.enableMovement = true;
                                        console.log('WorkstationBindingUI: 确认成功 - 延迟调用已设置children中player的enableMovement属性为true');
                                    }
                                    // 如果enableMovement是方法，调用它
                                    else if (typeof playerInChildren.enableMovement === 'function') {
                                        playerInChildren.enableMovement();
                                        console.log('WorkstationBindingUI: 确认成功 - 延迟调用已调用children中player的enableMovement方法');
                                    }
                                }
                            }
                            
                            if (!sceneRef.player && (!sceneRef.children || !sceneRef.children.list || !sceneRef.children.list.find(child => child instanceof Player))) {
                                console.error('WorkstationBindingUI: 确认成功 - 延迟调用无法恢复玩家移动 - player对象不存在');
                                console.error('WorkstationBindingUI: 确认成功 - 调试信息 - sceneRef:', sceneRef, 'player:', sceneRef?.player);
                            }
                        });
                    } else {
                        console.error('WorkstationBindingUI: 确认成功 - sceneRef为null，无法恢复玩家移动');
                    }
                }, 1500);
            } else {
                this.showMessage(result.error, 0xff4444);
            }
        } catch (error) {
            console.error('绑定失败:', error);
            this.showMessage('绑定失败，请重试', 0xff4444);
        }
    }

    handleCancel() {
        console.log('WorkstationBindingUI: handleCancel 被调用');
        console.log('WorkstationBindingUI: 当前scene对象:', !!this.scene);
        console.log('WorkstationBindingUI: 当前player对象:', !!this.scene?.player);
        
        // 保存scene引用，防止hide()方法影响
        const sceneRef = this.scene;
        const playerRef = this.scene?.player;
        
        // 尝试一个更简单的方法：直接设置enableMovement属性为true
        if (playerRef) {
            console.log('WorkstationBindingUI: 找到player对象，尝试直接设置enableMovement属性');
            // 如果enableMovement是属性，直接设置
            if (typeof playerRef.enableMovement !== 'function') {
                playerRef.enableMovement = true;
                console.log('WorkstationBindingUI: 已设置enableMovement属性为true');
            }
            // 如果enableMovement是方法，调用它
            else if (typeof playerRef.enableMovement === 'function') {
                playerRef.enableMovement();
                console.log('WorkstationBindingUI: 已调用enableMovement方法');
            }
        }
        
        this.hide();
        
        // 使用延迟调用作为确保恢复的备选方案
        if (sceneRef) {
            // 尝试多个延迟时间来找到合适的时机
            const delays = [50, 100, 200, 500];
            
            delays.forEach(delay => {
                sceneRef.time.delayedCall(delay, () => {
                    console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 尝试恢复玩家移动`);
                    
                    // 方法1：尝试直接访问scene.player
                    if (sceneRef.player) {
                        console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到scene.player`);
                        // 如果enableMovement是属性，直接设置
                        if (typeof sceneRef.player.enableMovement !== 'function') {
                            sceneRef.player.enableMovement = true;
                            console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 已设置enableMovement属性为true`);
                        }
                        // 如果enableMovement是方法，调用它
                        else if (typeof sceneRef.player.enableMovement === 'function') {
                            sceneRef.player.enableMovement();
                            console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 已调用enableMovement方法`);
                        }
                    }
                    
                    // 方法2：尝试通过scene.children.list查找player对象
                    else if (sceneRef.children && sceneRef.children.list) {
                        console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 尝试在children中查找Player对象`);
                        const playerInChildren = sceneRef.children.list.find(child => {
                            // 检查是否是Player实例
                            if (child instanceof Player) {
                                console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到Player实例`);
                                return true;
                            }
                            // 检查是否有enableMovement属性或方法
                            if ('enableMovement' in child) {
                                console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到enableMovement属性的对象`);
                                return true;
                            }
                            return false;
                        });
                        
                        if (playerInChildren) {
                            console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 在children中找到player对象`);
                            // 如果enableMovement是属性，直接设置
                            if (typeof playerInChildren.enableMovement !== 'function') {
                                playerInChildren.enableMovement = true;
                                console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 已设置children中player的enableMovement属性为true`);
                            }
                            // 如果enableMovement是方法，调用它
                            else if (typeof playerInChildren.enableMovement === 'function') {
                                playerInChildren.enableMovement();
                                console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 已调用children中player的enableMovement方法`);
                            }
                        }
                    }
                    
                    console.log(`WorkstationBindingUI: ${delay}ms延迟调用 - 恢复尝试完成`);
                });
            });
        } else {
            console.error('WorkstationBindingUI: sceneRef为null，无法执行延迟调用');
        }
    }

    showMessage(message, color = 0x4a9eff) {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        const messageText = this.scene.add.text(
            centerX,
            centerY + 140,
            message,
            {
                fontSize: '16px',
                fill: `#${color.toString(16).padStart(6, '0')}`,
                fontFamily: 'Arial'
            }
        );
        messageText.setOrigin(0.5);
        messageText.setScrollFactor(0);

        this.bindingWindow.add(messageText);

        // 3秒后移除消息
        setTimeout(() => {
            if (messageText && messageText.active) {
                messageText.destroy();
            }
        }, 3000);
    }

    update() {
        // 可以在这里添加更新逻辑
    }
}