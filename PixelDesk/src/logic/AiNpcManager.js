import { Player } from '../entities/Player.js';

/**
 * AI NPC 管理器 - 进阶版
 * 增加本地随机 NPC 生成、多样化角色模板以及轻量级 AI 游荡逻辑
 */
export class AiNpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcGroup = null;
        this.npcs = new Map(); // id -> npcCharacter

        // NPC 角色模板库 - 使用项目中实际存在的资源
        this.templates = [
            {
                role: '保洁员',
                sprite: 'Female_Cleaner_girl_idle_48x48',
                personality: '一个勤劳的保洁员，总是碎碎念哪里的地板不干净。',
                greetings: ['嘿，走路小心点，这地板我刚拖过！', '要是看到垃圾记得捡起来哦。', '唉，这办公室的人怎么这么多...']
            },
            {
                role: 'IT支援',
                sprite: 'Male_Adam_idle_48x48',
                personality: '冷静的技术宅，总是背着电脑。',
                greetings: ['重启试过了吗？', '我在等编译，正好出来转转。', '网络没问题吧？如果有问题别找我，找路由器。']
            },
            {
                role: '商务经理',
                sprite: 'Male_Conference_man_idle_48x48',
                personality: '总是很忙，在找人开会。',
                greetings: ['下午的会议你参加吗？', '帮我看看这个 PPT 逻辑对不对。', '咖啡...我需要更多的咖啡。']
            },
            {
                role: 'HR琳达',
                sprite: 'Female_Conference_woman_idle_48x48',
                personality: '优雅但充满威慑力，时刻观察着员工的状态。',
                greetings: ['今天的工作进度怎么样？', '别忘了提交下周的周报。', '欢迎来到 PixelDesk，加油。']
            }
        ];
    }

    /**
     * 初始化管理器
     */
    async init() {
        // 优先复用场景中已经定义好的物理组
        this.npcGroup = this.scene.npcGroup || this.scene.physics.add.group({ immovable: true });

        // 设置全域物理阻挡与交互 (物理实体感 + 对话触发)
        if (this.scene.player) {
            // 实体碰撞阻挡
            this.scene.physics.add.collider(this.scene.player, this.npcGroup);

            // 交互触发回调
            this.scene.physics.add.overlap(this.scene.player, this.npcGroup, (p, npc) => {
                if (typeof this.scene.handlePlayerCollision === 'function') {
                    this.scene.handlePlayerCollision(p, npc);
                }
            });
        }

        // 确保 NPC 进入其他玩家 group (为了兼容 Start.js 中的其他逻辑)
        if (!this.scene.otherPlayersGroup) {
            this.scene.otherPlayersGroup = this.scene.physics.add.group();
        }

        // 定时设置环境碰撞，确保图层已加载
        this.scene.time.delayedCall(1000, () => {
            if (this.scene.mapLayers) {
                const layers = [this.scene.mapLayers.office_1, this.scene.mapLayers.tree];
                layers.forEach(layer => {
                    if (layer) this.scene.physics.add.collider(this.npcGroup, layer);
                });
            }
            if (this.scene.deskColliders) {
                this.scene.physics.add.collider(this.npcGroup, this.scene.deskColliders);
            }
        });

        // 1. 加载服务器端的 NPC
        await this.loadAndCreateNpcs();
    }

    /**
     * 加载数据库中的所有活跃 NPC
     */
    async loadAndCreateNpcs() {
        try {
            const response = await fetch('/api/ai/npcs');
            const data = await response.json();
            const npcs = data.data || data.npcs;
            if (data.success && Array.isArray(npcs)) {
                for (const npcData of npcs) {
                    this.createAiNpc(npcData).then(npc => {
                        if (npc && npc.name !== 'Sarah') { // Sarah 站前台不动，其他人都去游荡
                            this.startWandering(npc);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('🤖 [AiNpcManager] 加载 NPCs 失败:', error);
        }
    }

    startWandering(npc) {
        if (!npc || !npc.body) return;

        // 记录“家”的位置，用于约束范围（可选）
        const homeX = npc.x;
        const homeY = npc.y;

        const roamAction = () => {
            if (!npc.active || !npc.body) return;

            // 随机做决定：60% 概率走动，40% 概率休息
            if (Phaser.Math.Between(0, 100) > 40) {
                // 随机选择一个方向
                const directions = ['up', 'down', 'left', 'right'];
                const direction = Phaser.Utils.Array.GetRandom(directions);
                const walkDuration = Phaser.Math.Between(1500, 4000);
                const speed = Phaser.Math.Between(40, 80); // 散步速度

                // 计算速度向量
                let vx = 0, vy = 0;
                if (direction === 'left') vx = -speed;
                else if (direction === 'right') vx = speed;
                else if (direction === 'up') vy = -speed;
                else if (direction === 'down') vy = speed;

                // 开始移动
                npc.body.setVelocity(vx, vy);
                if (npc.setDirectionFrame) npc.setDirectionFrame(direction);

                // 定时停止
                this.scene.time.delayedCall(walkDuration, () => {
                    if (npc.active && npc.body) {
                        npc.body.setVelocity(0, 0);
                        // 到了目的地，随机停顿 5-15 秒
                        this.scene.time.delayedCall(Phaser.Math.Between(5000, 15000), roamAction);
                    }
                });
            } else {
                // 休息状态
                this.scene.time.delayedCall(Phaser.Math.Between(5000, 10000), roamAction);
            }
        };

        // 首次启动延迟一点
        this.scene.time.delayedCall(Phaser.Math.Between(1000, 5000), roamAction);

        // 每帧同步 AI 图标
        this.scene.events.on('update', () => {
            if (npc.active && npc.aiIcon) {
                npc.aiIcon.x = npc.x + 25;
                npc.aiIcon.y = npc.y - 50;
            }
        });
    }


    /**
     * 创建单个 NPC 实体
     */
    async createAiNpc(npcData) {
        let { id, name, sprite, x, y, greeting } = npcData;

        // 每次刷新给 NPC 一个随机的初始位置偏移，让场景更有活力
        if (name !== 'Sarah') {
            x += Phaser.Math.Between(-150, 150);
            y += Phaser.Math.Between(-150, 150);
        }

        // 检查精灵
        const textureKey = sprite;
        // ... (保持精灵加载逻辑不变)
        if (!this.scene.textures.exists(textureKey)) {
            try {
                await new Promise((resolve, reject) => {
                    this.scene.load.spritesheet(textureKey, `/assets/characters/${sprite}.png`, {
                        frameWidth: 48, frameHeight: 48
                    });
                    this.scene.load.once('complete', resolve);
                    this.scene.load.once('loaderror', () => reject());
                    this.scene.load.start();
                });
            } catch (e) {
                console.warn(`🤖 NPC 精灵 ${sprite} 加载失败`);
                return null;
            }
        }

        const texture = this.scene.textures.get(textureKey);
        const frameCount = texture ? texture.frameTotal : 0;
        const isCompactFormat = frameCount <= 12 || sprite.includes('Premade');

        const npcCharacter = new Player(
            this.scene, x, y, textureKey,
            false, // enableMovement (这是针对键盘控制的)
            false, // enableStateSave
            true,  // isOtherPlayer
            {
                id: id.startsWith('npc_') ? id : `npc_${id}`,
                name: name,
                currentStatus: {
                    type: 'available',
                    status: npcData.role || npcData.personality?.substring(0, 10) || 'AI助手',
                    emoji: '🤖',
                    message: greeting,
                    timestamp: new Date().toISOString()
                },
                isOnline: true
            },
            { isCompactFormat }
        );

        if (npcCharacter.body) {
            // NPC 的物理设定：Immovable 确保玩家撞不动 NPC
            // 恢复为与玩家一致的大碰撞箱 (40x60)，确保碰撞感扎实
            npcCharacter.body.setSize(40, 60);
            npcCharacter.body.setOffset(-20, -12);
            npcCharacter.body.setImmovable(true);
            npcCharacter.body.moves = true;
            npcCharacter.body.setCollideWorldBounds(true);
        }

        npcCharacter.setScale(0.8);
        npcCharacter.setDepth(1000);
        if (npcCharacter.setDirectionFrame) npcCharacter.setDirectionFrame('down');

        // 同时加入这两个 Group：
        // 1. npcGroup 用于物理碰撞限制（如撞墙）
        // 2. otherPlayersGroup 用于触发对话 Interaction（兼容 Start.js 中的逻辑）
        if (this.npcGroup) this.npcGroup.add(npcCharacter);
        if (this.scene.otherPlayersGroup) {
            this.scene.otherPlayersGroup.add(npcCharacter);
            if (typeof this.scene.ensurePlayerCharacterOverlap === 'function') {
                this.scene.ensurePlayerCharacterOverlap();
            }
        }

        this.createAiIcon(npcCharacter, x, y);
        this.setupInteractions(npcCharacter);

        this.scene.add.existing(npcCharacter);
        this.npcs.set(id, npcCharacter);
        return npcCharacter;
    }

    createAiIcon(npcCharacter, x, y) {
        const aiIcon = this.scene.add.text(x + 25, y - 50, '🤖', { fontSize: '16px' });
        aiIcon.setOrigin(0.5);
        aiIcon.setDepth(1100);
        npcCharacter.aiIcon = aiIcon;
        this.scene.tweens.add({
            targets: aiIcon, y: '-=5', duration: 1000,
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1
        });
    }

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
