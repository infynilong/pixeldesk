export class RegisterScene extends Phaser.Scene {
    constructor() {
        super('RegisterScene');
        this.selectedCharacter = null;
        this.username = '';
        this.characterThumbnails = [];
    }

    preload() {
        // 加载角色图片用于选择
        const characterAssets = [
            'Premade_Character_48x48_01.png',
            'Premade_Character_48x48_02.png',
            'Premade_Character_48x48_03.png',
            'Premade_Character_48x48_04.png',
            'Premade_Character_48x48_05.png',
            'Premade_Character_48x48_06.png',
            'Premade_Character_48x48_07.png',
            'Premade_Character_48x48_08.png',
            'Premade_Character_48x48_09.png',
            'Premade_Character_48x48_10.png',
            'Premade_Character_48x48_11.png',
            'Premade_Character_48x48_12.png',
            'Premade_Character_48x48_13.png',
            'Premade_Character_48x48_14.png',
            'Premade_Character_48x48_15.png',
            'Premade_Character_48x48_16.png',
            'Premade_Character_48x48_17.png',
            'Premade_Character_48x48_18.png',
            'Premade_Character_48x48_19.png',
            'Premade_Character_48x48_20.png',
        ];

        characterAssets.forEach(filename => {
            const key = filename.replace('.png', '');
            this.load.spritesheet(key, `/assets/characters/${filename}`, { frameWidth: 48, frameHeight: 48 });
        });

        // 加载UI背景
        this.load.image('ui_bg', '/assets/ui/background.svg');
    }

    create() {
        // 创建背景
        this.createBackground();
        
        // 创建标题
        this.createTitle();
        
        // 创建用户名输入框
        this.createUsernameInput();
        
        // 创建角色选择区域
        this.createCharacterSelection();
        
        // 创建注册按钮
        this.createRegisterButton();
        
        // 检查是否已经注册
        this.checkExistingUser();
    }

    createBackground() {
        // 创建半透明背景
        const bg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        );
        bg.setScrollFactor(0);
        
        // 创建注册窗口背景
        const windowBg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            800,
            600,
            0x2a2a2a,
            0.95
        );
        windowBg.setScrollFactor(0);
        windowBg.setStrokeStyle(2, 0x4a9eff);
    }

    createTitle() {
        const title = this.add.text(
            this.cameras.main.width / 2,
            80,
            '欢迎来到 PixelDesk',
            {
                fontSize: '32px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);

        const subtitle = this.add.text(
            this.cameras.main.width / 2,
            120,
            '请创建您的账户并选择角色形象',
            {
                fontSize: '18px',
                fill: '#cccccc',
                fontFamily: 'Arial'
            }
        );
        subtitle.setOrigin(0.5);
        subtitle.setScrollFactor(0);
    }

    createUsernameInput() {
        // 用户名标签
        const label = this.add.text(
            this.cameras.main.width / 2 - 200,
            160,
            '用户名:',
            {
                fontSize: '20px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        label.setScrollFactor(0);

        // 创建输入框（使用HTML元素）
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.placeholder = '请输入您的用户名';
        inputElement.style.position = 'absolute';
        inputElement.style.left = '50%';
        inputElement.style.top = '180px';
        inputElement.style.transform = 'translateX(-50%)';
        inputElement.style.width = '300px';
        inputElement.style.height = '40px';
        inputElement.style.fontSize = '18px';
        inputElement.style.padding = '8px';
        inputElement.style.border = '2px solid #4a9eff';
        inputElement.style.borderRadius = '5px';
        inputElement.style.backgroundColor = '#1a1a1a';
        inputElement.style.color = '#ffffff';
        inputElement.style.zIndex = '1000';

        document.body.appendChild(inputElement);

        inputElement.addEventListener('input', (e) => {
            this.username = e.target.value;
        });

        // 存储输入框引用，以便在场景销毁时移除
        this.usernameInput = inputElement;
    }

    createCharacterSelection() {
        const label = this.add.text(
            this.cameras.main.width / 2 - 200,
            240,
            '选择角色形象:',
            {
                fontSize: '20px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        label.setScrollFactor(0);

        // 创建角色选择网格
        const charactersPerRow = 5;
        const characterSize = 64;
        const spacing = 20;
        const startX = this.cameras.main.width / 2 - (charactersPerRow * (characterSize + spacing)) / 2;
        const startY = 280;

        const characterKeys = [
            'Premade_Character_48x48_01', 'Premade_Character_48x48_02', 'Premade_Character_48x48_03', 'Premade_Character_48x48_04', 'Premade_Character_48x48_05',
            'Premade_Character_48x48_06', 'Premade_Character_48x48_07', 'Premade_Character_48x48_08', 'Premade_Character_48x48_09', 'Premade_Character_48x48_10',
            'Premade_Character_48x48_11', 'Premade_Character_48x48_12', 'Premade_Character_48x48_13', 'Premade_Character_48x48_14', 'Premade_Character_48x48_15',
            'Premade_Character_48x48_16', 'Premade_Character_48x48_17', 'Premade_Character_48x48_18', 'Premade_Character_48x48_19', 'Premade_Character_48x48_20'
        ];

        this.characterThumbnails = [];

        characterKeys.forEach((key, index) => {
            const row = Math.floor(index / charactersPerRow);
            const col = index % charactersPerRow;
            
            const x = startX + col * (characterSize + spacing) + characterSize / 2;
            const y = startY + row * (characterSize + spacing) + characterSize / 2;

            // 创建角色缩略图
            const thumbnail = this.add.container(x, y);
            
            // 创建背景框
            const bg = this.add.rectangle(0, 0, characterSize, characterSize, 0x3a3a3a);
            bg.setStrokeStyle(2, 0x666666);
            
            // 创建角色精灵
            const sprite = this.add.sprite(0, 0, key);
            sprite.setDisplaySize(48, 48);
            sprite.setFrame(0); // 显示正面朝向
            
            thumbnail.add([bg, sprite]);
            thumbnail.setScrollFactor(0);
            thumbnail.setData('key', key);
            thumbnail.setData('index', index);
            
            // 添加点击事件
            bg.setInteractive();
            bg.on('pointerdown', () => this.selectCharacter(key, thumbnail));
            
            this.characterThumbnails.push(thumbnail);
        });

        // 创建选中状态显示
        this.selectedCharacterDisplay = this.add.text(
            this.cameras.main.width / 2,
            500,
            '请选择一个角色',
            {
                fontSize: '16px',
                fill: '#cccccc',
                fontFamily: 'Arial'
            }
        );
        this.selectedCharacterDisplay.setOrigin(0.5);
        this.selectedCharacterDisplay.setScrollFactor(0);
    }

    selectCharacter(key, thumbnail) {
        // 清除之前的选中状态
        this.characterThumbnails.forEach(t => {
            t.list[0].setStrokeStyle(2, 0x666666); // 重置边框
        });

        // 设置新的选中状态
        thumbnail.list[0].setStrokeStyle(3, 0x4a9eff);
        this.selectedCharacter = key;
        
        // 更新显示文本
        this.selectedCharacterDisplay.setText(`已选择角色: ${key}`);
    }

    createRegisterButton() {
        const button = this.add.rectangle(
            this.cameras.main.width / 2,
            560,
            200,
            50,
            0x4a9eff
        );
        button.setScrollFactor(0);
        button.setInteractive();
        
        const buttonText = this.add.text(
            this.cameras.main.width / 2,
            560,
            '注册并开始游戏',
            {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        );
        buttonText.setOrigin(0.5);
        buttonText.setScrollFactor(0);

        button.on('pointerdown', () => this.handleRegister());
        button.on('pointerover', () => button.setFillStyle(0x5aafff));
        button.on('pointerout', () => button.setFillStyle(0x4a9eff));
    }

    async handleRegister() {
        if (!this.username.trim()) {
            this.showError('请输入用户名');
            return;
        }

        if (!this.selectedCharacter) {
            this.showError('请选择一个角色');
            return;
        }

        try {
            // 预留后端接口
            const userData = await this.registerUser({
                username: this.username.trim(),
                character: this.selectedCharacter,
                points: 50 // 注册送50积分
            });

            // 保存用户数据到本地
            this.saveUserData(userData);

            // 移除输入框
            if (this.usernameInput) {
                document.body.removeChild(this.usernameInput);
            }

            // 跳转到主场景
            this.scene.start('Start', { userData });

        } catch (error) {
            console.error('注册失败:', error);
            this.showError('注册失败，请重试');
        }
    }

    async registerUser(userData) {
        console.log('开始注册用户:', userData);
        
        try {
            // 调用后端API创建用户
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: Date.now().toString(),
                    name: userData.username,
                    avatar: userData.character,
                    points: userData.points,
                    gold: userData.points
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('用户注册成功:', result.data);
                return {
                    id: result.data.id,
                    username: result.data.name,
                    character: result.data.avatar,
                    points: result.data.points,
                    gold: result.data.gold,
                    registeredAt: result.data.createdAt,
                    workstations: [] // 用户绑定的工位
                };
            } else {
                console.error('用户注册失败:', result.error);
                // 如果API失败，回退到本地创建
                return {
                    id: Date.now().toString(),
                    username: userData.username,
                    character: userData.character,
                    points: userData.points,
                    gold: userData.points,
                    registeredAt: new Date().toISOString(),
                    workstations: [] // 用户绑定的工位
                };
            }
        } catch (error) {
            console.error('调用用户注册API失败:', error);
            // API失败时回退到本地创建
            return {
                id: Date.now().toString(),
                username: userData.username,
                character: userData.character,
                points: userData.points,
                gold: userData.points,
                registeredAt: new Date().toISOString(),
                workstations: [] // 用户绑定的工位
            };
        }
    }

    saveUserData(userData) {
        localStorage.setItem('pixelDeskUser', JSON.stringify(userData));
    }

    checkExistingUser() {
        const savedUser = localStorage.getItem('pixelDeskUser');
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            
            // 移除输入框
            if (this.usernameInput) {
                document.body.removeChild(this.usernameInput);
            }

            // 直接跳转到主场景
            this.scene.start('Start', { userData });
        }
    }

    showError(message) {
        // 创建错误提示
        const errorText = this.add.text(
            this.cameras.main.width / 2,
            620,
            message,
            {
                fontSize: '16px',
                fill: '#ff4444',
                fontFamily: 'Arial'
            }
        );
        errorText.setOrigin(0.5);
        errorText.setScrollFactor(0);

        // 3秒后移除错误提示
        this.time.delayedCall(3000, () => {
            errorText.destroy();
        });
    }

    shutdown() {
        // 清理输入框
        if (this.usernameInput && document.body.contains(this.usernameInput)) {
            document.body.removeChild(this.usernameInput);
        }
        super.shutdown();
    }
}