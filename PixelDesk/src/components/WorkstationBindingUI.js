import { Player } from '../entities/Player.js';
import { t } from '../i18n/workstation.js';

// ===== 性能优化配置 =====
const PERFORMANCE_CONFIG = {
    // 禁用控制台日志以大幅减少CPU消耗
    ENABLE_DEBUG_LOGGING: false,
    // 关键错误和警告仍然显示
    ENABLE_ERROR_LOGGING: true
}

// 性能优化的日志系统
const debugLog = PERFORMANCE_CONFIG.ENABLE_DEBUG_LOGGING ? console.log.bind(console) : () => { }
const debugWarn = PERFORMANCE_CONFIG.ENABLE_ERROR_LOGGING ? console.warn.bind(console) : () => { }

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

        // 创建深色实心背景（不透明）
        const bg = this.scene.add.rectangle(
            centerX,
            centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000,
            1.0  // 完全不透明
        );
        bg.setScrollFactor(0);
        bg.setDepth(999);

        // 创建像素风格窗口背景（完全不透明）
        const windowBg = this.scene.add.rectangle(
            centerX,
            centerY,
            450,
            280,
            0x1a1a2e,  // 深蓝黑色
            1.0  // 完全不透明
        );
        windowBg.setScrollFactor(0);
        windowBg.setStrokeStyle(3, 0x00ffff);  // 青色边框，更粗
        windowBg.setDepth(999);

        // 添加装饰性像素风格边框
        const innerBorder = this.scene.add.rectangle(
            centerX,
            centerY,
            440,
            270,
            0x000000,
            0
        );
        innerBorder.setScrollFactor(0);
        innerBorder.setStrokeStyle(2, 0x4a9eff);
        innerBorder.setDepth(1000);

        // 标题 - 使用多语言
        const title = this.scene.add.text(
            centerX,
            centerY - 100,
            t('bindingTitle'),
            {
                fontSize: '28px',
                fill: '#00ffff',  // 青色
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(1001);

        // 工位信息 - 使用多语言
        const infoText = this.scene.add.text(
            centerX,
            centerY - 40,
            `${t('workstationId')}: ${this.currentWorkstation.id}\n${t('position')}: (${Math.floor(this.currentWorkstation.position.x)}, ${Math.floor(this.currentWorkstation.position.y)})\n${t('type')}: ${this.currentWorkstation.type}`,
            {
                fontSize: '16px',
                fill: '#cccccc',
                fontFamily: 'monospace',
                align: 'center'
            }
        );
        infoText.setOrigin(0.5);
        infoText.setScrollFactor(0);
        infoText.setDepth(1001); // 文本在按钮上方

        // 费用信息 - 使用多语言
        const costText = this.scene.add.text(
            centerX,
            centerY + 20,
            `${t('bindingFee')}: 5${t('points')} (${t('duration')})`,
            {
                fontSize: '18px',
                fill: '#ffd700',
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        );
        costText.setOrigin(0.5);
        costText.setScrollFactor(0);
        costText.setDepth(1001); // 文本在按钮上方

        // 用户积分 - 使用多语言
        this.userPointsText = this.scene.add.text(
            centerX,
            centerY + 50,
            `${t('yourPoints')}: ${this.currentuser.points}`,
            {
                fontSize: '16px',
                fill: '#4a9eff',
                fontFamily: 'monospace'
            }
        );
        this.userPointsText.setOrigin(0.5);
        this.userPointsText.setScrollFactor(0);
        this.userPointsText.setDepth(1001); // 文本在按钮上方

        // 创建按钮
        const buttons = this.createButtons(centerX, centerY + 90);

        // 存储窗口组件
        this.bindingWindow = this.scene.add.container(0, 0, [
            bg, windowBg, innerBorder, title, infoText, costText, this.userPointsText, ...buttons
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
            t('confirm'),
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'monospace'
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
            t('cancel'),
            {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'monospace'
            }
        );
        cancelText.setOrigin(0.5);
        cancelText.setScrollFactor(0);
        cancelText.setDepth(1001); // 文本在按钮上方

        // 按钮事件
        confirmButton.on('pointerdown', () => {
            debugLog('确认按钮被点击');
            this.handleConfirm();
        });
        confirmButton.on('pointerover', () => confirmButton.setFillStyle(0x5aafff));
        confirmButton.on('pointerout', () => confirmButton.setFillStyle(0x4a9eff));

        cancelButton.on('pointerdown', () => {
            debugLog('取消按钮被点击');
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
                    this.userPointsText.setText(`${t('yourPoints')}: ${result.remainingPoints}`);
                }

                // 保存用户数据
                localStorage.setItem('pixelDeskUser', JSON.stringify(this.currentuser));

                // 显示成功消息
                this.showMessage(t('success'), 0x4a9eff);

                // 更新场景中的积分显示
                window.dispatchEvent(new CustomEvent('user-points-updated', {
                    detail: {
                        userId: this.currentuser.id,
                        points: result.remainingPoints
                    }
                }));

                // 更新用户数据到UI（包括工位ID）
                this.scene.sendUserDataToUI();

                // 延迟关闭窗口
                setTimeout(() => {
                    // 保存scene引用，防止hide()方法影响
                    const sceneRef = this.scene;
                    const playerRef = this.scene?.player;

                    // 先尝试立即恢复玩家移动
                    if (playerRef) {
                        debugLog('WorkstationBindingUI: 确认成功 - 找到player对象，尝试恢复移动');
                        // 如果enableMovement是属性，直接设置
                        if (typeof playerRef.enableMovement !== 'function') {
                            playerRef.enableMovement = true;
                            debugLog('WorkstationBindingUI: 确认成功 - 已设置enableMovement属性为true');
                        }
                        // 如果enableMovement是方法，调用它
                        else if (typeof playerRef.enableMovement === 'function') {
                            playerRef.enableMovement();
                            debugLog('WorkstationBindingUI: 确认成功 - 已调用enableMovement方法');
                        }
                    }

                    this.hide();

                    // 使用延迟调用作为确保恢复的备选方案
                    if (sceneRef) {
                        sceneRef.time.delayedCall(50, () => {
                            debugLog('WorkstationBindingUI: 确认成功 - 延迟调用尝试恢复玩家移动');

                            // 方法1：尝试直接访问scene.player
                            if (sceneRef.player) {
                                debugLog('WorkstationBindingUI: 确认成功 - 延迟调用找到scene.player');
                                // 如果enableMovement是属性，直接设置
                                if (typeof sceneRef.player.enableMovement !== 'function') {
                                    sceneRef.player.enableMovement = true;
                                    debugLog('WorkstationBindingUI: 确认成功 - 延迟调用已设置enableMovement属性为true');
                                }
                                // 如果enableMovement是方法，调用它
                                else if (typeof sceneRef.player.enableMovement === 'function') {
                                    sceneRef.player.enableMovement();
                                    debugLog('WorkstationBindingUI: 确认成功 - 延迟调用已调用enableMovement方法');
                                }
                            }
                            // 方法2：尝试通过scene.children.list查找player对象
                            else if (sceneRef.children && sceneRef.children.list) {
                                debugLog('WorkstationBindingUI: 确认成功 - 延迟调用尝试在children中查找Player对象');
                                const playerInChildren = sceneRef.children.list.find(child => child instanceof Player);
                                if (playerInChildren) {
                                    debugLog('WorkstationBindingUI: 确认成功 - 延迟调用在children中找到Player实例');
                                    // 如果enableMovement是属性，直接设置
                                    if (typeof playerInChildren.enableMovement !== 'function') {
                                        playerInChildren.enableMovement = true;
                                        debugLog('WorkstationBindingUI: 确认成功 - 延迟调用已设置children中player的enableMovement属性为true');
                                    }
                                    // 如果enableMovement是方法，调用它
                                    else if (typeof playerInChildren.enableMovement === 'function') {
                                        playerInChildren.enableMovement();
                                        debugLog('WorkstationBindingUI: 确认成功 - 延迟调用已调用children中player的enableMovement方法');
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
            this.showMessage(t('failed'), 0xff4444);
        }
    }

    handleCancel() {
        debugLog('WorkstationBindingUI: handleCancel 被调用');
        debugLog('WorkstationBindingUI: 当前scene对象:', !!this.scene);
        debugLog('WorkstationBindingUI: 当前player对象:', !!this.scene?.player);

        // 保存scene引用，防止hide()方法影响
        const sceneRef = this.scene;
        const playerRef = this.scene?.player;

        // 尝试一个更简单的方法：直接设置enableMovement属性为true
        if (playerRef) {
            debugLog('WorkstationBindingUI: 找到player对象，尝试直接设置enableMovement属性');
            // 如果enableMovement是属性，直接设置
            if (typeof playerRef.enableMovement !== 'function') {
                playerRef.enableMovement = true;
                debugLog('WorkstationBindingUI: 已设置enableMovement属性为true');
            }
            // 如果enableMovement是方法，调用它
            else if (typeof playerRef.enableMovement === 'function') {
                playerRef.enableMovement();
                debugLog('WorkstationBindingUI: 已调用enableMovement方法');
            }
        }

        this.hide();

        // 使用延迟调用作为确保恢复的备选方案
        if (sceneRef) {
            // 尝试多个延迟时间来找到合适的时机
            const delays = [50, 100, 200, 500];

            delays.forEach(delay => {
                sceneRef.time.delayedCall(delay, () => {
                    debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 尝试恢复玩家移动`);

                    // 方法1：尝试直接访问scene.player
                    if (sceneRef.player) {
                        debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到scene.player`);
                        // 如果enableMovement是属性，直接设置
                        if (typeof sceneRef.player.enableMovement !== 'function') {
                            sceneRef.player.enableMovement = true;
                            debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 已设置enableMovement属性为true`);
                        }
                        // 如果enableMovement是方法，调用它
                        else if (typeof sceneRef.player.enableMovement === 'function') {
                            sceneRef.player.enableMovement();
                            debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 已调用enableMovement方法`);
                        }
                    }

                    // 方法2：尝试通过scene.children.list查找player对象
                    else if (sceneRef.children && sceneRef.children.list) {
                        debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 尝试在children中查找Player对象`);
                        const playerInChildren = sceneRef.children.list.find(child => {
                            // 检查是否是Player实例
                            if (child instanceof Player) {
                                debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到Player实例`);
                                return true;
                            }
                            // 检查是否有enableMovement属性或方法
                            if ('enableMovement' in child) {
                                debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 找到enableMovement属性的对象`);
                                return true;
                            }
                            return false;
                        });

                        if (playerInChildren) {
                            debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 在children中找到player对象`);
                            // 如果enableMovement是属性，直接设置
                            if (typeof playerInChildren.enableMovement !== 'function') {
                                playerInChildren.enableMovement = true;
                                debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 已设置children中player的enableMovement属性为true`);
                            }
                            // 如果enableMovement是方法，调用它
                            else if (typeof playerInChildren.enableMovement === 'function') {
                                playerInChildren.enableMovement();
                                debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 已调用children中player的enableMovement方法`);
                            }
                        }
                    }

                    debugLog(`WorkstationBindingUI: ${delay}ms延迟调用 - 恢复尝试完成`);
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