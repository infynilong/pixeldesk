/**
 * 焦点管理器 - 解决Phaser键盘输入与Next.js输入框的冲突问题
 * 
 * 功能：
 * 1. 检测输入框焦点状态
 * 2. 检测鼠标位置
 * 3. 管理Phaser键盘监听的启用/禁用
 * 4. 提供焦点状态变化回调
 */
export class FocusManager {
    constructor(scene) {
        this.scene = scene;
        this.isGameFocused = true;
        this.isInputFocused = false;
        this.isMouseOverUI = false;
        this.keyboardEnabled = true;
        
        // 回调函数列表
        this.onFocusChangeCallbacks = [];
        
        this.init();
    }
    
    init() {
        this.setupInputFocusDetection();
        this.setupMouseOverDetection();
        this.setupCanvasFocusDetection();
        
        console.log('🎯 FocusManager initialized');
    }
    
    // ===== 输入框焦点检测 =====
    setupInputFocusDetection() {
        // 监听所有输入框的focus和blur事件
        document.addEventListener('focusin', (event) => {
            const isInputElement = this.isInputElement(event.target);
            
            if (isInputElement) {
                this.setInputFocused(true);
                console.log('📝 Input focused, keyboard disabled for game');
            }
        });
        
        document.addEventListener('focusout', (event) => {
            const isInputElement = this.isInputElement(event.target);
            
            if (isInputElement) {
                // 延迟一点检查，确保焦点真的离开了输入框
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    const stillInInput = this.isInputElement(activeElement);
                    
                    if (!stillInInput) {
                        this.setInputFocused(false);
                        console.log('📝 Input blurred, keyboard enabled for game');
                    }
                }, 50);
            }
        });
    }
    
    // 检查元素是否为输入元素
    isInputElement(element) {
        if (!element) return false;
        
        const inputTags = ['input', 'textarea', 'select'];
        const tagName = element.tagName.toLowerCase();
        
        // 检查基本输入标签
        if (inputTags.includes(tagName)) {
            return true;
        }
        
        // 检查contenteditable元素
        if (element.contentEditable === 'true') {
            return true;
        }
        
        // 检查是否在输入相关的容器内
        const inputContainers = [
            '[data-input-container]',
            '.input-container',
            '[role="textbox"]',
            '[contenteditable="true"]'
        ];
        
        for (const selector of inputContainers) {
            if (element.matches && element.matches(selector)) {
                return true;
            }
            if (element.closest && element.closest(selector)) {
                return true;
            }
        }
        
        return false;
    }
    
    // ===== 鼠标位置检测 =====
    setupMouseOverDetection() {
        // 检测鼠标是否在UI区域
        document.addEventListener('mousemove', (event) => {
            const isOverUI = this.isMouseOverUIElement(event.target);
            
            if (isOverUI !== this.isMouseOverUI) {
                this.setMouseOverUI(isOverUI);
            }
        });
        
        // 检测鼠标离开窗口
        document.addEventListener('mouseleave', () => {
            this.setMouseOverUI(false);
        });
    }
    
    // 检查鼠标是否在UI元素上
    isMouseOverUIElement(element) {
        if (!element) return false;
        
        // 检查是否是Phaser canvas
        if (element.tagName === 'CANVAS' && element.id === 'phaser-game') {
            return false;
        }
        
        // 检查是否在UI容器内
        const uiSelectors = [
            '.ui-container',
            '.tab-container',
            '.modal',
            '.dropdown',
            '.menu',
            '[data-ui-element]',
            'input',
            'textarea',
            'button',
            'select'
        ];
        
        for (const selector of uiSelectors) {
            if (element.matches && element.matches(selector)) {
                return true;
            }
            if (element.closest && element.closest(selector)) {
                return true;
            }
        }
        
        return false;
    }
    
    // ===== Canvas焦点检测 =====
    setupCanvasFocusDetection() {
        const canvas = this.scene.game.canvas;
        
        if (canvas) {
            // 使Canvas可聚焦
            canvas.tabIndex = 0;
            
            canvas.addEventListener('focus', () => {
                this.setGameFocused(true);
                console.log('🎮 Game canvas focused');
            });
            
            canvas.addEventListener('blur', () => {
                this.setGameFocused(false);
                console.log('🎮 Game canvas blurred');
            });
            
            // 点击canvas时自动聚焦
            canvas.addEventListener('click', () => {
                if (!this.isInputFocused) {
                    canvas.focus();
                }
            });
        }
    }
    
    // ===== 状态管理方法 =====
    setInputFocused(focused) {
        if (this.isInputFocused !== focused) {
            this.isInputFocused = focused;
            this.updateKeyboardState();
            this.notifyFocusChange();
        }
    }
    
    setMouseOverUI(overUI) {
        if (this.isMouseOverUI !== overUI) {
            this.isMouseOverUI = overUI;
            this.updateKeyboardState();
            this.notifyFocusChange();
        }
    }
    
    setGameFocused(focused) {
        if (this.isGameFocused !== focused) {
            this.isGameFocused = focused;
            this.updateKeyboardState();
            this.notifyFocusChange();
        }
    }
    
    // 更新键盘监听状态
    updateKeyboardState() {
        // 键盘输入启用条件：
        // 1. 游戏有焦点 AND
        // 2. 没有输入框被聚焦 AND  
        // 3. 鼠标不在UI元素上
        const shouldEnable = this.isGameFocused && !this.isInputFocused && !this.isMouseOverUI;
        
        if (this.keyboardEnabled !== shouldEnable) {
            this.keyboardEnabled = shouldEnable;
            console.log(`⌨️ Keyboard input ${shouldEnable ? 'ENABLED' : 'DISABLED'} for game`);
            console.log(`   - Game focused: ${this.isGameFocused}`);
            console.log(`   - Input focused: ${this.isInputFocused}`);
            console.log(`   - Mouse over UI: ${this.isMouseOverUI}`);
        }
    }
    
    // ===== 回调管理 =====
    onFocusChange(callback) {
        this.onFocusChangeCallbacks.push(callback);
    }
    
    notifyFocusChange() {
        const state = {
            isGameFocused: this.isGameFocused,
            isInputFocused: this.isInputFocused,
            isMouseOverUI: this.isMouseOverUI,
            keyboardEnabled: this.keyboardEnabled
        };
        
        this.onFocusChangeCallbacks.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Focus change callback error:', error);
            }
        });
    }
    
    // ===== 公共API =====
    
    // 检查是否应该处理键盘输入
    shouldHandleKeyboard() {
        return this.keyboardEnabled;
    }
    
    // 强制启用键盘输入（谨慎使用）
    forceEnableKeyboard() {
        this.keyboardEnabled = true;
        console.log('⌨️ Keyboard input FORCE ENABLED');
    }
    
    // 强制禁用键盘输入
    forceDisableKeyboard() {
        this.keyboardEnabled = false;
        console.log('⌨️ Keyboard input FORCE DISABLED');
    }
    
    // 获取当前焦点状态
    getFocusState() {
        return {
            isGameFocused: this.isGameFocused,
            isInputFocused: this.isInputFocused,
            isMouseOverUI: this.isMouseOverUI,
            keyboardEnabled: this.keyboardEnabled
        };
    }
    
    // 调试信息
    debugFocusState() {
        const state = this.getFocusState();
        console.log('🔍 Focus State Debug:');
        console.log('  Game Focused:', state.isGameFocused);
        console.log('  Input Focused:', state.isInputFocused);
        console.log('  Mouse Over UI:', state.isMouseOverUI);
        console.log('  Keyboard Enabled:', state.keyboardEnabled);
        console.log('  Active Element:', document.activeElement?.tagName, document.activeElement?.type);
    }
    
    // 清理方法
    destroy() {
        // 移除所有事件监听器
        // 注意：这里只是示例，实际实现需要保存事件处理器的引用以便移除
        console.log('🎯 FocusManager destroyed');
    }
}