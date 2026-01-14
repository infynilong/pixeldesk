/**
 * 室内区域管理器
 *
 * 功能：
 * - 定义和管理室内区域
 * - 检测玩家是否在室内
 * - 支持从 Tiled 地图或代码配置加载室内区域
 */
export class IndoorAreasManager {
    constructor(scene) {
        this.scene = scene
        this.indoorAreas = []

        console.log('🏠 [IndoorAreasManager] 室内区域管理器已创建')
    }

    /**
     * 从 Tiled 地图加载室内区域
     * @param {string} layerName - 对象层名称（默认为 'indoor-areas'）
     */
    loadFromTiledMap(layerName = 'indoor-areas') {
        if (!this.scene.map) {
            console.warn('🏠 [IndoorAreasManager] 未找到地图对象')
            return
        }

        const objectLayer = this.scene.map.getObjectLayer(layerName)
        if (!objectLayer) {
            console.warn(`🏠 [IndoorAreasManager] 未找到对象层: ${layerName}`)
            return
        }

        // 清空现有区域
        this.indoorAreas = []

        // 读取所有室内区域矩形
        objectLayer.objects.forEach(obj => {
            this.addArea({
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                name: obj.name || 'Unnamed Area'
            })
        })

        console.log(`🏠 [IndoorAreasManager] 从地图加载了 ${this.indoorAreas.length} 个室内区域`)
    }

    /**
     * 手动添加室内区域
     * @param {Object} area - 区域对象 {x, y, width, height, name}
     */
    addArea(area) {
        this.indoorAreas.push({
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            name: area.name || 'Unnamed Area'
        })
    }

    /**
     * 手动定义室内区域（用于没有 Tiled 对象层的情况）
     * @param {Array} areas - 区域数组
     *
     * 示例:
     * defineIndoorAreas([
     *   { x: 100, y: 100, width: 500, height: 400, name: '办公室1' },
     *   { x: 700, y: 100, width: 300, height: 300, name: '办公室2' }
     * ])
     */
    defineIndoorAreas(areas) {
        this.indoorAreas = []
        areas.forEach(area => this.addArea(area))
        console.log(`🏠 [IndoorAreasManager] 手动定义了 ${this.indoorAreas.length} 个室内区域`)
    }

    /**
     * 检查一个点是否在室内
     * @param {number} x - 世界坐标 X
     * @param {number} y - 世界坐标 Y
     * @returns {boolean}
     */
    isPointIndoor(x, y) {
        return this.indoorAreas.some(area => {
            return x >= area.x &&
                   x <= area.x + area.width &&
                   y >= area.y &&
                   y <= area.y + area.height
        })
    }

    /**
     * 检查玩家是否在室内
     * @returns {boolean}
     */
    isPlayerIndoor() {
        if (!this.scene.player) {
            return false
        }

        const px = this.scene.player.x
        const py = this.scene.player.y

        return this.isPointIndoor(px, py)
    }

    /**
     * 获取玩家所在的室内区域信息
     * @returns {Object|null} - 区域对象或 null
     */
    getPlayerIndoorArea() {
        if (!this.scene.player) {
            return null
        }

        const px = this.scene.player.x
        const py = this.scene.player.y

        return this.indoorAreas.find(area => {
            return px >= area.x &&
                   px <= area.x + area.width &&
                   py >= area.y &&
                   py <= area.y + area.height
        })
    }

    /**
     * 获取所有室内区域
     * @returns {Array}
     */
    getAllAreas() {
        return this.indoorAreas
    }

    /**
     * 清空所有室内区域
     */
    clearAll() {
        this.indoorAreas = []
        console.log('🏠 [IndoorAreasManager] 已清空所有室内区域')
    }

    /**
     * 调试：绘制所有室内区域（用于可视化）
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics 对象
     */
    debugDraw(graphics) {
        if (!graphics) {
            console.warn('🏠 [IndoorAreasManager] 需要提供 Graphics 对象')
            return
        }

        graphics.clear()
        graphics.lineStyle(2, 0x00ff00, 1) // 绿色边框

        this.indoorAreas.forEach(area => {
            // 绘制矩形边框
            graphics.strokeRect(area.x, area.y, area.width, area.height)

            // 填充半透明绿色
            graphics.fillStyle(0x00ff00, 0.1)
            graphics.fillRect(area.x, area.y, area.width, area.height)
        })

        console.log('🏠 [IndoorAreasManager] 已绘制调试信息')
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.indoorAreas = []
        console.log('🏠 [IndoorAreasManager] 室内区域管理器已销毁')
    }
}
