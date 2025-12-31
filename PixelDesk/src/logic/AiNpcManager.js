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
        if (!this.npcGroup) {
            this.npcGroup = this.scene.npcGroup || this.scene.physics.add.group({ immovable: true });
        }

        // 设置碰撞
        if (this.scene.player) {
            this.scene.physics.add.collider(this.scene.player, this.npcGroup, (playerObj, npcObj) => {
                if (typeof this.scene.handlePlayerCollision === 'function') {
                    this.scene.handlePlayerCollision(playerObj, npcObj);
                }
            });
        }

        // 1. 加载服务器固定 NPC (如 Sarah)
        await this.loadAndCreateNpcs();

        // 2. 本地随机生成更多游荡 NPC (不保存到服务器)
        this.spawnRandomWanderers(15);
    }

    /**
     * 生成本地游荡 NPC
     */
    spawnRandomWanderers(count) {
        console.log(`🤖 [AiNpcManager] 正在本地生成 ${count} 个游荡 NPC...`);

        for (let i = 0; i < count; i++) {
            const template = Phaser.Utils.Array.GetRandom(this.templates);

            // 随机坐标 - 显著扩大生成范围，覆盖更大的办公区域
            const randomX = 5800 + Phaser.Math.Between(-2500, 2500);
            const randomY = 750 + Phaser.Math.Between(-1500, 1500);

            const npcData = {
                id: `local_${i}_${Date.now()}`,
                name: `${template.role}-${Phaser.Math.Between(10, 99)}`,
                sprite: template.sprite,
                x: randomX,
                y: randomY,
                greeting: Phaser.Utils.Array.GetRandom(template.greetings),
                personality: template.personality,
                isLocal: true // 标记为本地 NPC
            };

            this.createAiNpc(npcData).then(npc => {
                if (npc) {
                    // 启动游荡逻辑
                    this.startWandering(npc);
                }
            });
        }
    }

    /**
     * 游荡 AI 逻辑 (轻量级本地实现)
     */
    startWandering(npc) {
        if (!npc || !npc.body) return;

        // 记录“家”的位置，防止走太远
        const homeX = npc.x;
        const homeY = npc.y;

        const roamAction = () => {
            if (!npc.active) return;

            // 随机做决定：50% 概率走动，50% 概率休息
            if (Phaser.Math.Between(0, 100) > 40) { // 稍微提高移动频率
                // 挑选一个在“家”附近的新目标点 - 增加移动半径
                const targetX = homeX + Phaser.Math.Between(-300, 300);
                const targetY = homeY + Phaser.Math.Between(-300, 300);

                // 计算方向
                const dx = targetX - npc.x;
                const dy = targetY - npc.y;
                let direction = 'down';
                if (Math.abs(dx) > Math.abs(dy)) {
                    direction = dx > 0 ? 'right' : 'left';
                } else {
                    direction = dy > 0 ? 'down' : 'up';
                }

                // 设置朝向
                if (npc.setDirectionFrame) npc.setDirectionFrame(direction);

                // 使用 Tween 移动坐标 (物理身体 moves=false，所以直接对容器使用 tween)
                this.scene.tweens.add({
                    targets: npc,
                    x: targetX,
                    y: targetY,
                    duration: Phaser.Math.Between(3000, 6000), // 走得很慢，像在散步
                    ease: 'Linear',
                    onUpdate: () => {
                        if (npc.aiIcon) {
                            npc.aiIcon.x = npc.x + 25;
                            npc.aiIcon.y = npc.y - 50;
                        }
                    },
                    onComplete: () => {
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
    }

    /**
     * 加载服务器固定 NPC
     */
    async loadAndCreateNpcs() {
        try {
            const response = await fetch('/api/ai/npcs');
            const data = await response.json();
            const npcs = data.data || data.npcs;
            if (data.success && Array.isArray(npcs)) {
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

        // 检查精灵
        const textureKey = sprite;
        if (!this.scene.textures.exists(textureKey)) {
            // 尝试加载，如果失败则回退到默认
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
                console.warn(`🤖 NPC 精灵 ${sprite} 加载失败，回退到默认`);
                // 如果是 Sarah，必须要这个精灵。如果是本地，可以选一个存在的。
                return null;
            }
        }

        const texture = this.scene.textures.get(textureKey);
        const frameCount = texture ? texture.frameTotal : 0;
        // 如果帧数很少（通常为8帧或更少），则认为是紧凑格式
        const isCompactFormat = frameCount <= 12 || sprite.includes('Premade');

        const npcCharacter = new Player(
            this.scene, x, y, textureKey,
            false, false, true,
            {
                id: id.startsWith('npc_') ? id : `npc_${id}`,
                name: name,
                currentStatus: {
                    type: 'available',
                    status: npcData.personality?.substring(0, 10) || 'AI助手',
                    emoji: '🤖',
                    message: greeting,
                    timestamp: new Date().toISOString()
                },
                isOnline: true
            },
            { isCompactFormat }
        );

        if (npcCharacter.body) {
            npcCharacter.body.setSize(30, 24);
            npcCharacter.body.setOffset(-15, 0);
            npcCharacter.body.setImmovable(true);
            npcCharacter.body.moves = false;
        }

        npcCharacter.setScale(0.8);
        npcCharacter.setDepth(1000);
        if (npcCharacter.setDirectionFrame) npcCharacter.setDirectionFrame('down');

        if (this.npcGroup) this.npcGroup.add(npcCharacter);
        if (this.scene.otherPlayersGroup) this.scene.otherPlayersGroup.add(npcCharacter);

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
