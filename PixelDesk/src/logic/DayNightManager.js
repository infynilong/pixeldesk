/**
 * 昼夜系统管理器
 *
 * 功能：
 * - 基于真实时间判断白天/夜晚
 * - 对 background 和 tree 图块层应用夜晚滤镜
 * - 支持自定义时间段配置
 * - 平滑的昼夜过渡
 */
export class DayNightManager {
    constructor(scene, layers = {}, config = {}) {
        this.scene = scene
        this.layers = layers  // 保存图层引用，特别是 background 层

        // 默认配置：20:00-6:00 为夜晚
        this.config = {
            nightStart: config.nightStart || 20,  // 夜晚开始时间（小时）
            nightEnd: config.nightEnd || 6,       // 夜晚结束时间（小时）
            transitionDuration: config.transitionDuration || 2000, // 过渡动画时长（毫秒）
            checkInterval: config.checkInterval || 60000, // 检查间隔（毫秒），默认1分钟
            nightTint: config.nightTint || 0x4040aa,  // 夜晚色调（深蓝色）
            nightAlpha: config.nightAlpha || 0.6,     // 夜晚透明度
            ...config
        }

        // 当前状态
        this.isNight = false
        this.isTransitioning = false

        // 事件回调
        this.onDayStart = null
        this.onNightStart = null

        // 初始化
        this.init()
    }

    init() {
        // 立即检查一次当前时间
        this.checkTimeAndUpdate()

        // 定期检查时间变化
        this.scene.time.addEvent({
            delay: this.config.checkInterval,
            callback: this.checkTimeAndUpdate,
            callbackScope: this,
            loop: true
        })

        console.log('🌓 [DayNightManager] 昼夜系统已初始化')
    }

    /**
     * 检查当前时间并更新状态
     */
    checkTimeAndUpdate() {
        const shouldBeNight = this.shouldBeNightTime()

        if (shouldBeNight !== this.isNight && !this.isTransitioning) {
            this.isTransitioning = true

            if (shouldBeNight) {
                this.transitionToNight()
            } else {
                this.transitionToDay()
            }
        }
    }

    /**
     * 判断当前是否应该是夜晚
     * @returns {boolean}
     */
    shouldBeNightTime() {
        const now = new Date()
        const hour = now.getHours()

        // 夜晚时段跨越午夜的情况（例如 20:00 - 6:00）
        if (this.config.nightStart > this.config.nightEnd) {
            return hour >= this.config.nightStart || hour < this.config.nightEnd
        }

        // 夜晚时段在同一天的情况（例如 1:00 - 5:00，不常见）
        return hour >= this.config.nightStart && hour < this.config.nightEnd
    }

    /**
     * 过渡到夜晚
     */
    transitionToNight() {
        console.log('🌙 [DayNightManager] 进入夜晚模式')
        this.isNight = true

        // 对 background 和 tree 层应用夜晚滤镜
        const layersToProcess = ['background', 'tree']

        layersToProcess.forEach(layerName => {
            if (this.layers[layerName]) {
                this.scene.tweens.add({
                    targets: this.layers[layerName],
                    alpha: this.config.nightAlpha,
                    duration: this.config.transitionDuration,
                    ease: 'Sine.easeInOut',
                    onStart: () => {
                        // 设置夜晚色调
                        this.layers[layerName].setTint(this.config.nightTint)
                    }
                })
                console.log(`🌙 [DayNightManager] 对 ${layerName} 层应用夜晚效果`)
            }
        })

        // 触发夜晚开始回调
        if (this.onNightStart) {
            this.onNightStart()
        }

        // 过渡完成后重置标志
        this.scene.time.delayedCall(this.config.transitionDuration, () => {
            this.isTransitioning = false
        })
    }

    /**
     * 过渡到白天
     */
    transitionToDay() {
        console.log('☀️ [DayNightManager] 进入白天模式')
        this.isNight = false

        // 恢复 background 和 tree 层到白天状态
        const layersToProcess = ['background', 'tree']

        layersToProcess.forEach(layerName => {
            if (this.layers[layerName]) {
                this.scene.tweens.add({
                    targets: this.layers[layerName],
                    alpha: 1.0,
                    duration: this.config.transitionDuration,
                    ease: 'Sine.easeInOut',
                    onStart: () => {
                        // 清除色调
                        this.layers[layerName].clearTint()
                    }
                })
                console.log(`☀️ [DayNightManager] 恢复 ${layerName} 层到白天状态`)
            }
        })

        // 触发白天开始回调
        if (this.onDayStart) {
            this.onDayStart()
        }

        // 过渡完成后重置标志
        this.scene.time.delayedCall(this.config.transitionDuration, () => {
            this.isTransitioning = false
        })
    }

    /**
     * 获取当前是否是夜晚
     * @returns {boolean}
     */
    isNightTime() {
        return this.isNight
    }

    /**
     * 获取当前小时
     * @returns {number}
     */
    getCurrentHour() {
        return new Date().getHours()
    }

    /**
     * 获取当前时间描述
     * @returns {string}
     */
    getTimeDescription() {
        const hour = this.getCurrentHour()

        if (hour >= 6 && hour < 12) return '早晨'
        if (hour >= 12 && hour < 14) return '中午'
        if (hour >= 14 && hour < 18) return '下午'
        if (hour >= 18 && hour < 20) return '傍晚'
        return '夜晚'
    }

    /**
     * 手动设置为夜晚（用于测试）
     */
    forceNight() {
        if (!this.isNight) {
            this.transitionToNight()
            return '🌙 已强制切换到夜晚模式'
        }
        return '🌙 当前已经是夜晚模式'
    }

    /**
     * 手动设置为白天（用于测试）
     */
    forceDay() {
        if (this.isNight) {
            this.transitionToDay()
            return '☀️ 已强制切换到白天模式'
        }
        return '☀️ 当前已经是白天模式'
    }

    /**
     * 获取过渡进度（0-1）
     * @returns {number}
     */
    getTransitionProgress() {
        // 可以用于实现更平滑的过渡效果
        const now = new Date()
        const hour = now.getHours()
        const minute = now.getMinutes()
        const currentTime = hour + minute / 60

        // 计算到夜晚/白天开始的距离
        if (this.isNight) {
            // 夜晚，计算到白天的进度
            let hoursUntilDay
            if (hour < this.config.nightEnd) {
                hoursUntilDay = this.config.nightEnd - currentTime
            } else {
                hoursUntilDay = 24 - currentTime + this.config.nightEnd
            }
            return Math.max(0, Math.min(1, 1 - hoursUntilDay / 2))
        } else {
            // 白天，计算到夜晚的进度
            const hoursUntilNight = this.config.nightStart - currentTime
            return Math.max(0, Math.min(1, 1 - hoursUntilNight / 2))
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.onDayStart = null
        this.onNightStart = null
        console.log('🌓 [DayNightManager] 昼夜系统已销毁')
    }
}
