/**
 * BabyHeadScan - 相机控制模块
 * 处理摄像头调用、拍照和图像捕获
 * 支持6个角度拍摄: right, left, front, top, back, forehead
 */
class CameraController {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.facingMode = 'environment';
        this.flashOn = false;
        this.photos = {};
        this.currentAngle = null;
        this.isReady = false;
    }

    static ANGLES = [
        { id: 'right',    label: '正右侧面', icon: '👤' },
        { id: 'left',     label: '正左侧面', icon: '👤' },
        { id: 'front',    label: '正脸',     icon: '😊' },
        { id: 'top',      label: '头顶',     icon: '🔝' },
        { id: 'back',     label: '后脑勺',   icon: '🔙' },
        { id: 'forehead', label: '额头',     icon: '💆' }
    ];

    static getAngleIndex(angleId) {
        return CameraController.ANGLES.findIndex(a => a.id === angleId);
    }

    static getAngleLabel(angleId) {
        const angle = CameraController.ANGLES.find(a => a.id === angleId);
        return angle ? angle.label : angleId;
    }

    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * 初始化相机 - 最简可靠的实现
     */
    async init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.isReady = false;

        // 停掉旧流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // 获取摄像头
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode },
                audio: false
            });
        } catch (e) {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            } catch (e2) {
                throw new Error('无法访问摄像头，请确认已授权相机权限');
            }
        }

        this.video.srcObject = this.stream;

        // 等待第一帧可用（loadeddata 是最可靠的事件）
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.video.removeEventListener('loadeddata', onReady);
                reject(new Error('摄像头启动超时，请刷新重试'));
            }, 12000);

            const onReady = () => {
                clearTimeout(timeout);
                this.video.removeEventListener('loadeddata', onReady);
                resolve();
            };

            // readyState >= 2 说明已有帧
            if (this.video.readyState >= 2) {
                clearTimeout(timeout);
                resolve();
            } else {
                this.video.addEventListener('loadeddata', onReady);
            }
        });

        // 设置 canvas 尺寸
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;

        this.isReady = true;
    }

    setAngle(angleId) {
        this.currentAngle = angleId;
        this._updateOverlay(angleId);
    }

    _updateOverlay(angleId) {
        document.querySelectorAll('.overlay-guide').forEach(o => o.classList.add('hidden'));
        const overlay = document.getElementById('overlay-' + angleId);
        if (overlay) overlay.classList.remove('hidden');

        const label = document.getElementById('current-angle-label');
        if (label) label.textContent = CameraController.getAngleLabel(angleId);

        this._updateCaptureCount();
    }

    _updateCaptureCount() {
        const el = document.getElementById('capture-count');
        if (el) {
            const n = Object.values(this.photos).filter(Boolean).length;
            el.textContent = n + '/6 已拍摄';
        }
    }

    capture() {
        if (!this.isReady || !this.currentAngle) return null;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        var ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        var dataUrl = this.canvas.toDataURL('image/jpeg', 0.92);
        this.photos[this.currentAngle] = dataUrl;

        this._updateCaptureCount();
        this._flashScreen();

        return dataUrl;
    }

    _flashScreen() {
        var overlay = document.getElementById('camera-overlay');
        if (overlay) {
            overlay.style.backgroundColor = 'rgba(255,255,255,0.8)';
            setTimeout(function() {
                overlay.style.backgroundColor = 'transparent';
            }, 130);
        }
    }

    allPhotosTaken() {
        return CameraController.ANGLES.every(function(a) { return this.photos[a.id]; }, this);
    }

    getRemainingAngles() {
        return CameraController.ANGLES.filter(function(a) { return !this.photos[a.id]; }, this);
    }

    getAllPhotos() {
        var result = {};
        for (var k in this.photos) { result[k] = this.photos[k]; }
        return result;
    }

    retakeAngle(angleId) {
        this.photos[angleId] = null;
        this._updateCaptureCount();
    }

    switchToAngle(angleId) {
        this.currentAngle = angleId;
        this._updateOverlay(angleId);
    }

    reset() {
        this.photos = {};
        this.currentAngle = null;
        this._updateCaptureCount();
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        if (this.stream) this.stream.getTracks().forEach(function(t) { t.stop(); });
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: this.facingMode },
            audio: false
        });
        this.video.srcObject = this.stream;
    }

    toggleFlash() {
        this.flashOn = !this.flashOn;
        return this.flashOn;
    }

    drawPreview(canvasEl, angleId) {
        var dataUrl = this.photos[angleId];
        if (!dataUrl || !canvasEl) return;
        var img = new Image();
        img.onload = function() {
            var ctx = canvasEl.getContext('2d');
            var max = 160, w = img.width, h = img.height;
            if (w > h) { h = h * (max / w); w = max; }
            else { w = w * (max / h); h = max; }
            canvasEl.width = w;
            canvasEl.height = h;
            ctx.drawImage(img, 0, 0, w, h);
        };
        img.src = dataUrl;
    }

    drawAllPreviews() {
        var self = this;
        CameraController.ANGLES.forEach(function(a) {
            var c = document.getElementById('preview-canvas-' + a.id);
            if (c && self.photos[a.id]) self.drawPreview(c, a.id);
        });
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(function(t) { t.stop(); });
            this.stream = null;
        }
        if (this.video) this.video.srcObject = null;
        this.isReady = false;
    }
}

window.CameraController = CameraController;