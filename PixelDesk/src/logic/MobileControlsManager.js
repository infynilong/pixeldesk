export class MobileControlsManager {
    constructor(scene) {
        this.scene = scene;
        this.joystick = null;
        this.actionButton = null;
        this.isMobile = false;

        // Joystick state
        this.joystickVector = { x: 0, y: 0 };
        this.isActive = false;

        // Configuration
        this.config = {
            joystickSize: 60,
            thumbSize: 30,
            margin: 80,
            opacity: 0.5
        };

        this.checkDevice();
    }

    checkDevice() {
        // Detect if mobile device
        const width = window.innerWidth;
        this.isMobile = width < 768; // Matching BREAKPOINTS.mobile
    }

    init() {
        if (!this.isMobile) return;

        // Initialize multi-touch for pinch zoom
        this.scene.input.addPointer(1);

        this.createJoystick();
        this.createActionButton();
        this.setupPinchToZoom();

        console.log('📱 Mobile controls initialized');
    }

    createJoystick() {
        const { joystickSize, thumbSize, margin, opacity } = this.config;
        // Move Joystick to Right Side
        const x = this.scene.cameras.main.width - margin - joystickSize;
        const y = this.scene.cameras.main.height - margin - joystickSize;

        this.joystickContainer = this.scene.add.container(x, y).setScrollFactor(0).setDepth(1000);

        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x888888, opacity);
        bg.fillCircle(0, 0, joystickSize);
        bg.lineStyle(2, 0xffffff, opacity);
        bg.strokeCircle(0, 0, joystickSize);
        this.joystickContainer.add(bg);

        // Thumb
        this.thumb = this.scene.add.graphics();
        this.thumb.fillStyle(0xffffff, opacity + 0.2);
        this.thumb.fillCircle(0, 0, thumbSize);
        this.joystickContainer.add(this.thumb);

        // Input handling
        const hitArea = new Phaser.Geom.Circle(0, 0, joystickSize * 1.5);
        this.joystickContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        this.scene.input.on('pointerdown', (pointer) => {
            if (this.isPointerInJoystick(pointer)) {
                this.isActive = true;
                this.updateJoystick(pointer);
            }
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (this.isActive) {
                this.updateJoystick(pointer);
            }
        });

        this.scene.input.on('pointerup', () => {
            this.isActive = false;
            this.joystickVector = { x: 0, y: 0 };
            this.thumb.setPosition(0, 0);
        });
    }

    isPointerInJoystick(pointer) {
        const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickContainer.x, this.joystickContainer.y);
        return d < this.config.joystickSize * 1.5;
    }

    updateJoystick(pointer) {
        const { joystickSize } = this.config;
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickContainer.x, this.joystickContainer.y);
        const angle = Phaser.Math.Angle.Between(this.joystickContainer.x, this.joystickContainer.y, pointer.x, pointer.y);

        const clampedDist = Math.min(dist, joystickSize);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;

        this.thumb.setPosition(thumbX, thumbY);

        // Normalize vector
        this.joystickVector = {
            x: thumbX / joystickSize,
            y: thumbY / joystickSize
        };
    }

    createActionButton() {
        const margin = 80;
        const size = 40;
        // Move Action Button to Left Side
        const x = margin + size;
        const y = this.scene.cameras.main.height - margin - size;

        this.actionButton = this.scene.add.container(x, y).setScrollFactor(0).setDepth(1000);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x3b82f6, 0.6); // blue-500
        bg.fillCircle(0, 0, size);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeCircle(0, 0, size);
        this.actionButton.add(bg);

        const text = this.scene.add.text(0, 0, 'F', {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.actionButton.add(text);

        this.actionButton.setInteractive(new Phaser.Geom.Circle(0, 0, size), Phaser.Geom.Circle.Contains);

        this.actionButton.on('pointerdown', () => {
            this.actionButton.setScale(0.9);
            // Emit interaction event matching F key
            this.scene.events.emit('mobile-action-press');
            // Support legacy event bus
            if (window.gameEventBus) {
                window.gameEventBus.emit('interaction:start');
            }
        });

        this.actionButton.setAlpha(0); // Hide by default
    }

    showActionButton() {
        if (this.actionButton) {
            this.actionButton.setAlpha(1);
            this.actionButton.setVisible(true);
        }
    }

    hideActionButton() {
        if (this.actionButton) {
            this.actionButton.setAlpha(0);
            this.actionButton.setVisible(false);
        }
    }

    setupPinchToZoom() {
        let initialDistance = 0;
        let initialZoom = 1;

        this.scene.input.on('pointermove', (pointer) => {
            const p1 = this.scene.input.pointer1;
            const p2 = this.scene.input.pointer2;

            if (p1 && p1.isDown && p2 && p2.isDown) {
                const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

                if (initialDistance === 0) {
                    initialDistance = dist;
                    initialZoom = this.scene.cameras.main.zoom;
                } else {
                    const factor = dist / initialDistance;
                    const newZoom = Phaser.Math.Clamp(initialZoom * factor, 0.5, 2);
                    this.scene.cameras.main.setZoom(newZoom);
                    // Update deadzone and keep in storage
                    if (this.scene.updateDeadzone) this.scene.updateDeadzone();
                    localStorage.setItem("cameraZoom", newZoom.toString());
                }
            }
        });

        this.scene.input.on('pointerup', () => {
            initialDistance = 0;
        });
    }

    getVector() {
        return this.joystickVector;
    }

    getDirection() {
        if (!this.isActive || (Math.abs(this.joystickVector.x) < 0.2 && Math.abs(this.joystickVector.y) < 0.2)) {
            return null;
        }

        const angle = Math.atan2(this.joystickVector.y, this.joystickVector.x) * (180 / Math.PI);

        if (angle >= -45 && angle < 45) return 'right';
        if (angle >= 45 && angle < 135) return 'down';
        if (angle >= -135 && angle < -45) return 'up';
        return 'left';
    }
}
