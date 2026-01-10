export class BillboardManager {
    constructor(scene) {
        this.scene = scene;
        this.billboards = new Map(); // id -> billboard object
        this.activeContent = [];
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.lastUpdateTime = 0;
        this.isNear = false;
    }

    createBillboard(tiledObject, sprite) {
        const billboard = {
            id: tiledObject.id,
            sprite: sprite,
            position: { x: tiledObject.x, y: tiledObject.y },
            size: { width: tiledObject.width || 128, height: tiledObject.height || 128 },
            name: tiledObject.name || '',
            active: true
        };

        this.billboards.set(tiledObject.id, billboard);
        this.setupInteraction(billboard);
        return billboard;
    }

    setupInteraction(billboard) {
        if (!billboard.sprite) return;

        billboard.sprite.setInteractive();
        billboard.sprite.on('pointerdown', () => this.onBillboardClick(billboard.id));
    }

    onBillboardClick(id) {
        console.log(`Billboard ${id} clicked`);
        this.showBillboardUI();
    }

    showBillboardUI() {
        // 触发 React 层的 UI 显示
        window.dispatchEvent(new CustomEvent('open-billboard', {
            detail: {
                content: this.activeContent
            }
        }));
    }

    async updateContent() {
        try {
            console.log('Fetching billboard content...');
            const response = await fetch('/api/billboard/active');
            const result = await response.json();
            if (result.success) {
                this.activeContent = result.data;
                console.log('Billboard content updated:', this.activeContent);
                this.lastUpdateTime = Date.now();
            }
        } catch (error) {
            console.error('Failed to fetch billboard content:', error);
        }
    }

    // 由 Start.js 调用，避免在管理器内部每帧查询
    setProximity(isNear) {
        if (this.isNear !== isNear) {
            this.isNear = isNear;
            console.log(`[Billboard] Proximity changed: ${isNear}`);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('billboard-proximity-change', {
                    detail: {
                        isNear: isNear,
                        content: this.activeContent
                    }
                }));
            }
        }
    }

    update() {
        // 只有场景激活时才执行
        if (!this.scene.scene.isActive()) return;

        // 定时更新内容
        if (Date.now() - this.lastUpdateTime > this.updateInterval) {
            this.updateContent();
        }
    }
}
