import { Player } from '../entities/Player.js';

/**
 * AI NPC 管理器
 * 负责加载、创建、物理设置以及与 AI NPC 的交互逻辑
 */
export class AiNpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcGroup = null;
        this.npcs = new Map(); // id -> npcCharacter
    }

    /**
     * 初始化管理器
     */
    async init() {
        // 初始化 NPC 物理组
        if (!this.npcGroup) {
            this.npcGroup = this.scene.npcGroup || this.scene.physics.add.group({ immovable: true });
        }

        // 设置碰撞 (与主玩家)
        if (this.scene.player) {
            this.scene.physics.add.collider(this.scene.player, this.npcGroup, (playerObj, npcObj) => {
                if (typeof this.scene.handlePlayerCollision === 'function') {
                    this.scene.handlePlayerCollision(playerObj, npcObj);
                }
            });
        }

        // 加载 NPC 数据
        await this.loadAndCreateNpcs();
    }

    /**
     * 从 API 加载并创建 NPC
     */
    async loadAndCreateNpcs() {
        console.log('🤖 [AiNpcManager] 开始加载 AI NPCs...');
        try {
            const response = await fetch('/api/ai/npcs');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const npcs = data.data || data.npcs; // 兼容两种可能的结构
            if (data.success && Array.isArray(npcs)) {
                console.log(`🤖 [AiNpcManager] 发现 ${npcs.length} 个 NPC`);

                for (const npcData of npcs) {
                    await this.createAiNpc(npcData);
                }
            }
        } catch (error) {
            console.error('🤖 [AiNpcManager] 加载 NPCs 失败:', error);
        }
    }

    /**
     * 创建单个 NPC 实体
     */
    async createAiNpc(npcData) {
        const { id, name, sprite, x, y, greeting } = npcData;

        // 检查精灵是否已加载，如果没有则动态加载
        const textureKey = sprite;
        if (!this.scene.textures.exists(textureKey)) {
            const spritePath = `/assets/characters/${sprite}.png`;
            console.log(`🤖 [AiNpcManager] 动态加载精灵: ${spritePath}`);

            try {
                await new Promise((resolve, reject) => {
                    this.scene.load.spritesheet(textureKey, spritePath, {
                        frameWidth: 48,
                        frameHeight: 48
                    });
                    this.scene.load.once('complete', resolve);
                    this.scene.load.once('loaderror', () => reject(new Error('Load error')));
                    this.scene.load.start();
                });
            } catch (e) {
                console.error(`🤖 [AiNpcManager] 无法加载 NPC 精灵 ${sprite}`, e);
                return null;
            }
        }

        // 检测格式 (紧凑 vs 传统)
        const texture = this.scene.textures.get(textureKey);
        const frameCount = texture ? texture.frameTotal : 0;
        // 基于前期调试，如果用户改为了 true 或手动逻辑，我们保留这个判断
        const isCompactFormat = frameCount === 8 || sprite.includes('Premade_Character');

        const characterConfig = { isCompactFormat };
        const playerData = {
            id: `npc_${id}`,
            name: name,
            currentStatus: {
                type: 'available',
                status: 'AI助手',
                emoji: '🤖',
                message: greeting || '你好！',
                timestamp: new Date().toISOString()
            },
            isOnline: true
        };

        // 创建 Player 实例
        const npcCharacter = new Player(
            this.scene,
            x,
            y,
            textureKey,
            false, // enableMovement
            false, // enableStateSave
            true,  // isOtherPlayer
            playerData,
            characterConfig
        );

        // 设置物理属性
        if (npcCharacter.body) {
            npcCharacter.body.setSize(30, 24);
            npcCharacter.body.setOffset(-15, 0); // 刚才微调准的位置
            npcCharacter.body.setImmovable(true);
            npcCharacter.body.moves = false;
        }

        // 设置视觉属性
        npcCharacter.setScale(0.8);
        npcCharacter.setDepth(1000);
        if (typeof npcCharacter.setDirectionFrame === 'function') {
            npcCharacter.setDirectionFrame('down');
        }

        // 添加到组
        if (this.npcGroup) {
            this.npcGroup.add(npcCharacter);
        }
        if (this.scene.otherPlayersGroup) {
            this.scene.otherPlayersGroup.add(npcCharacter);
        }

        // 创建 AI 图标
        this.createAiIcon(npcCharacter, x, y);

        // 设置交互效果
        this.setupInteractions(npcCharacter);

        this.scene.add.existing(npcCharacter);
        this.npcs.set(id, npcCharacter);

        console.log(`🤖 [AiNpcManager] NPC "${name}" 已就绪`);
        return npcCharacter;
    }

    /**
     * 创建头顶 AI 图标
     */
    createAiIcon(npcCharacter, x, y) {
        const aiIcon = this.scene.add.text(x + 25, y - 50, '🤖', {
            fontSize: '16px'
        });
        aiIcon.setOrigin(0.5);
        aiIcon.setDepth(1100);
        npcCharacter.aiIcon = aiIcon;

        this.scene.tweens.add({
            targets: aiIcon,
            y: '-=5',
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * 设置交互事件
     */
    setupInteractions(npcCharacter) {
        npcCharacter.on('pointerover', () => {
            npcCharacter.setScale(0.85);
            this.scene.input.setDefaultCursor('pointer');
        });

        npcCharacter.on('pointerout', () => {
            npcCharacter.setScale(0.8);
            this.scene.input.setDefaultCursor('default');
        });
    }
}
