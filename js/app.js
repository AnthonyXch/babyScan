/**
 * BabyHeadScan - 主应用逻辑
 * 协调各模块完成：信息录入 → 6角度拍摄 → 分析 → 报告
 */
(function() {
    'use strict';

    // ===== 模块实例 =====
    const camera = new CameraController();
    const analyzer = new HeadShapeAnalyzer();
    const reportGen = new ReportGenerator();

    // ===== 全局状态 =====
    let babyInfo = {};
    let currentPhotoIndex = 0;
    const photoOrder = CameraController.ANGLES;

    // ===== API 配置 =====
    const API_BASE_URL = 'http://localhost:3456';
    const POLL_INTERVAL_MS = 2000;

    // ===== DOM缓存 =====
    const screens = {
        login:     document.getElementById('login-screen'),
        splash:    document.getElementById('splash-screen'),
        info:      document.getElementById('info-screen'),
        guide:     document.getElementById('guide-screen'),
        camera:    document.getElementById('camera-screen'),
        preview:   document.getElementById('preview-screen'),
        analyzing: document.getElementById('analyzing-screen'),
        report:    document.getElementById('report-screen')
    };

    const $ = (id) => document.getElementById(id);

    // ===== 屏幕切换 =====
    function showScreen(screenName) {
        Object.values(screens).forEach(s => s && s.classList.remove('active'));
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }

    // ===== Toast提示 =====
    function showToast(msg, duration = 2000) {
        const toast = $('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.remove('hidden');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }

    // ===== 登录/注册逻辑 =====
    function initLogin() {
        // 初始状态：显示"登录"+"注册"两个按钮
        const loginActions = $('login-actions');
        const loginForm = $('login-form');
        const registerForm = $('register-form');

        // 点击"登录" → 显示登录表单
        $('btn-show-login').addEventListener('click', () => {
            loginActions.classList.add('hidden');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        });

        // 点击"注册" → 显示注册表单
        $('btn-show-register').addEventListener('click', () => {
            loginActions.classList.add('hidden');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });

        // 登录/注册表单中的"返回"按钮 → 回到初始按钮组
        document.querySelectorAll('.btn-back-login, .btn-back-register').forEach(btn => {
            btn.addEventListener('click', () => {
                loginActions.classList.remove('hidden');
                loginForm.classList.add('hidden');
                registerForm.classList.add('hidden');
            });
        });

        // 密码显示/隐藏切换（登录）
        $('toggle-password').addEventListener('click', () => {
            const pwInput = $('login-password');
            const btn = $('toggle-password');
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                btn.textContent = '🙈';
            } else {
                pwInput.type = 'password';
                btn.textContent = '👁️';
            }
        });

        // 密码显示/隐藏切换（注册）
        $('toggle-reg-password').addEventListener('click', () => {
            const pwInput = $('reg-password');
            const btn = $('toggle-reg-password');
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                btn.textContent = '🙈';
            } else {
                pwInput.type = 'password';
                btn.textContent = '👁️';
            }
        });

        // 注册验证码倒计时
        let codeCountdown = 0;
        let codeTimer = null;
        $('btn-get-reg-code').addEventListener('click', () => {
            if (codeCountdown > 0) return;

            const phone = $('reg-phone').value.trim();
            if (!validatePhone(phone)) {
                showToast('请先输入正确的手机号');
                return;
            }

            // 模拟发送验证码
            const code = String(Math.floor(100000 + Math.random() * 900000));
            showToast('📨 验证码已发送：' + code, 3000);

            $('btn-get-reg-code')._lastCode = code;

            codeCountdown = 60;
            const btn = $('btn-get-reg-code');
            btn.disabled = true;
            btn.classList.add('counting');
            btn.textContent = `${codeCountdown}s`;

            codeTimer = setInterval(() => {
                codeCountdown--;
                if (codeCountdown <= 0) {
                    clearInterval(codeTimer);
                    codeTimer = null;
                    btn.disabled = false;
                    btn.classList.remove('counting');
                    btn.textContent = '获取验证码';
                } else {
                    btn.textContent = `${codeCountdown}s`;
                }
            }, 1000);
        });

        // 登录表单提交
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
        $('btn-login').addEventListener('click', (e) => {
            e.preventDefault();
            handleLogin();
        });

        // 注册表单提交
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegister();
        });
        $('btn-register').addEventListener('click', (e) => {
            e.preventDefault();
            handleRegister();
        });

        // 手机号输入限制（仅数字）
        ['login-phone', 'reg-phone'].forEach(id => {
            $(id).addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        });

        // 验证码输入限制（仅数字）
        $('reg-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    function validatePhone(phone) {
        return /^1[3-9]\d{9}$/.test(phone);
    }

    function handleLogin() {
        const phone = $('login-phone').value.trim();
        const password = $('login-password').value;

        if (!validatePhone(phone)) {
            showToast('请输入正确的11位手机号');
            return;
        }
        if (!password || password.length < 6) {
            showToast('请输入密码（至少6位）');
            return;
        }

        showToast('✅ 登录成功！', 1500);
        setTimeout(() => {
            showScreen('splash');
        }, 800);
    }

    function handleRegister() {
        const phone = $('reg-phone').value.trim();
        const password = $('reg-password').value;
        const code = $('reg-code').value.trim();
        const lastCode = $('btn-get-reg-code')._lastCode;

        if (!validatePhone(phone)) {
            showToast('请输入正确的11位手机号');
            return;
        }
        if (!password || password.length < 6) {
            showToast('请设置密码（至少6位）');
            return;
        }
        if (!code || code.length !== 6) {
            showToast('请输入6位验证码');
            return;
        }
        if (lastCode && code !== lastCode) {
            showToast('验证码错误，请重新输入');
            return;
        }

        showToast('✅ 注册成功！', 1500);
        setTimeout(() => {
            showScreen('splash');
        }, 800);
    }

    // ===== 初始化 =====
    function init() {
        initLogin();
        initPaymentModal();

        if (!CameraController.isSupported()) {
            alert('当前浏览器不支持摄像头，请使用现代浏览器（如Chrome）访问。');
            return;
        }

        // 启动页 - 开始按钮
        $('btn-start').addEventListener('click', () => {
            showScreen('info');
        });

        // 信息页 - 性别选择
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 信息页 - 开关选择器
        initToggleSelectors();

        // 信息页 - 下一步
        $('btn-next-to-camera').addEventListener('click', () => {
            if (!validateBabyInfo()) return;
            collectBabyInfo();
            camera.reset();
            updateGuideScreen();
            showScreen('guide');
        });

        // 引导页 - 打开相机
        $('btn-open-camera').addEventListener('click', () => {
            currentPhotoIndex = 0;
            openCameraForAngle(photoOrder[0].id);
        });

        // 相机页 - 拍照按钮
        $('btn-capture').addEventListener('click', () => {
            handleCapture();
        });

        // 相机页 - 切换摄像头
        $('btn-switch-camera').addEventListener('click', async () => {
            try {
                await camera.switchCamera();
            } catch (e) {
                showToast('切换摄像头失败，请重试');
            }
        });

        // 相机页 - 切换闪光灯
        $('btn-toggle-flash').addEventListener('click', () => {
            const on = camera.toggleFlash();
            $('btn-toggle-flash').textContent = on ? '💡' : '🔅';
        });

        // 预览页 - 生成报告按钮 → 显示付款
        $('btn-confirm-photos').addEventListener('click', () => {
            if (!camera.allPhotosTaken()) {
                showToast('请拍摄全部6个角度');
                return;
            }
            showPaymentModal();
        });

        // 预览页 - 重拍按钮（委托）
        document.getElementById('preview-screen').addEventListener('click', (e) => {
            const retakeBtn = e.target.closest('.btn-retake');
            if (retakeBtn) {
                const angleId = retakeBtn.getAttribute('data-angle');
                handleRetake(angleId);
            }
        });

        // 通用返回按钮
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.getAttribute('data-target');
                if (target) {
                    if (target === 'splash-screen') {
                        camera.stop();
                        camera.reset();
                        showScreen('splash');
                    } else if (target === 'info-screen') {
                        camera.stop();
                        showScreen('info');
                    } else if (target === 'camera-screen') {
                        showScreen('camera');
                    }
                }
            });
        });

        // 报告页 - 导出
        $('btn-export-report').addEventListener('click', () => {
            reportGen.exportReport();
        });

        // 报告页 - 新扫描
        $('btn-new-scan').addEventListener('click', () => {
            camera.stop();
            camera.reset();
            showScreen('splash');
        });
    }

    // ===== 开关选择器初始化 =====
    function initToggleSelectors() {
        const toggles = ['toggle-premature', 'toggle-hematoma', 'toggle-calcification'];
        toggles.forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            container.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });
    }

    // ===== 宝宝信息校验与收集 =====
    function validateBabyInfo() {
        const name = $('baby-name').value.trim();
        const age = parseInt($('baby-age').value);

        if (!name) {
            showToast('请填写宝宝昵称');
            return false;
        }
        if (!age || age < 0 || age > 730) {
            showToast('请填写正确的天数（0~730）');
            return false;
        }
        return true;
    }

    function collectBabyInfo() {
        babyInfo = {
            name: $('baby-name').value.trim(),
            gender: document.querySelector('.gender-btn.active')?.getAttribute('data-gender') || 'girl',
            ageDays: parseInt($('baby-age').value),
            isPremature: getToggleValue('toggle-premature'),
            headCircumference: $('head-circumference').value || null,
            hasHematoma: getToggleValue('toggle-hematoma'),
            hasCalcification: getToggleValue('toggle-calcification'),
            fontanelleSize: $('fontanelle-size').value || null
        };
    }

    function getToggleValue(containerId) {
        const activeBtn = document.querySelector(`#${containerId} .toggle-btn.active`);
        if (activeBtn) {
            return activeBtn.getAttribute('data-value') === 'yes';
        }
        return false;
    }

    // ===== 引导页更新 =====
    function updateGuideScreen() {
        CameraController.ANGLES.forEach(angle => {
            const statusEl = $(angle.id + '-status');
            if (statusEl) {
                statusEl.textContent = '待拍摄';
                statusEl.classList.remove('done');
            }
        });

        const cards = document.querySelectorAll('.angle-card');
        cards.forEach(c => c.classList.remove('active'));
        const firstCard = document.querySelector('.angle-card[data-angle="right"]');
        if (firstCard) {
            firstCard.classList.add('active');
        }
    }

    // ===== 打开相机 =====
    async function openCameraForAngle(angleId) {
        // 先切换到相机页面
        showScreen('camera');

        const video = $('camera-video');
        const canvas = $('camera-canvas');

        try {
            if (!camera.isReady) {
                await camera.init(video, canvas);
            }
        } catch (e) {
            console.error('摄像头初始化失败:', e);
            showToast('无法打开摄像头: ' + (e.message || '请检查权限设置'));
            showScreen('guide');
            return;
        }

        camera.setAngle(angleId);
        currentPhotoIndex = CameraController.getAngleIndex(angleId);
    }

    // ===== 拍照处理 =====
    function handleCapture() {
        const dataUrl = camera.capture();
        if (!dataUrl) {
            showToast('拍照失败，请重试');
            return;
        }

        showToast('📸 拍摄成功！', 1000);

        // 更新引导页状态
        updateGuideStatusAfterCapture();

        // 检查是否全部拍完
        if (camera.allPhotosTaken()) {
            setTimeout(() => {
                camera.drawAllPreviews();
                showScreen('preview');
            }, 600);
            return;
        }

        // 自动切换到下一个未拍摄的角度
        setTimeout(() => {
            const remaining = camera.getRemainingAngles();
            if (remaining.length > 0) {
                currentPhotoIndex = CameraController.getAngleIndex(remaining[0].id);
                camera.switchToAngle(remaining[0].id);
            }
        }, 800);
    }

    function updateGuideStatusAfterCapture() {
        CameraController.ANGLES.forEach(angle => {
            const statusEl = $(angle.id + '-status');
            if (statusEl && camera.photos[angle.id]) {
                statusEl.textContent = '✅ 已拍摄';
                statusEl.classList.add('done');
            }
        });

        const cards = document.querySelectorAll('.angle-card');
        cards.forEach(c => c.classList.remove('active'));

        const nextAngle = camera.getRemainingAngles()[0];
        if (nextAngle) {
            const nextCard = document.querySelector(`.angle-card[data-angle="${nextAngle.id}"]`);
            if (nextCard) nextCard.classList.add('active');
        }
    }

    // ===== 重拍处理 =====
    function handleRetake(angleId) {
        camera.retakeAngle(angleId);
        camera.drawAllPreviews();
        currentPhotoIndex = CameraController.getAngleIndex(angleId);
        openCameraForAngle(angleId);
    }

    // ===== 付款弹窗（后端对接 + 静态收款码） =====
    var currentOrderId = null;
    var paymentPollTimer = null;
    var paymentPaid = false;
    var useStaticQR = false;

    async function showPaymentModal() {
        var modal = $('payment-modal');
        modal.style.display = 'flex';
        paymentPaid = false;
        useStaticQR = false;
        
        // 重置UI
        resetPaymentUI();
        
        // 先获取配置，检查是否启用静态收款码
        try {
            var cfgResp = await fetch(API_BASE_URL + '/api/config');
            var cfgJson = await cfgResp.json();
            if (cfgJson.code === 0 && cfgJson.data.staticQR && cfgJson.data.staticQR.enabled) {
                // 使用静态收款码图片
                useStaticQR = true;
                var staticCfg = cfgJson.data.staticQR;
                showStaticQRCode(staticCfg);
                return;
            }
        } catch (e) {
            // 获取配置失败，走下方正常流程
        }
        
        // 调用后端创建订单
        try {
            var resp = await fetch(API_BASE_URL + '/api/payment/create', { method: 'POST' });
            var json = await resp.json();
            if (json.code === 0) {
                currentOrderId = json.data.orderId;
                generateQRCodeFromUrl(json.data.qrCodeUrl, json.data.orderId);
                startPaymentPolling();
            } else {
                showToast('创建支付订单失败');
                hidePaymentModal();
            }
        } catch (e) {
            console.error('创建订单失败:', e);
            // 后端未启动时，降级为本地模拟模式
            showToast('⚠️ 后端未连接，使用本地模拟模式');
            currentOrderId = 'LOCAL_' + Date.now();
            generateSimulatedQR();
            setupLocalSimPayment();
        }
    }

    // 显示静态收款码图片
    function showStaticQRCode(staticCfg) {
        var qrCanvas = $('qr-canvas');
        var qrImage = $('qr-image');
        var qrHint = document.querySelector('.qr-hint');
        var amountHint = document.querySelector('.qr-amount-hint');
        var btnDone = $('btn-payment-done');

        // 隐藏canvas，显示图片
        if (qrCanvas) qrCanvas.style.display = 'none';
        if (qrImage) {
            qrImage.src = API_BASE_URL + staticCfg.imagePath;
            qrImage.style.display = 'block';
            qrImage.onerror = function() {
                // 图片加载失败，回退到canvas
                qrImage.style.display = 'none';
                if (qrCanvas) qrCanvas.style.display = 'block';
                if (qrHint) qrHint.textContent = '📱 请将收款码图片放入 server/public/ 目录';
                generateSimulatedQR();
                setupLocalSimPayment();
            };
        }

        // 更新提示文字
        if (qrHint) {
            qrHint.textContent = '📱 请使用微信/支付宝扫描上方收款码';
            qrHint.style.color = 'var(--text-light)';
        }
        if (amountHint) {
            amountHint.textContent = '💰 请支付 ¥' + (staticCfg.amount / 100).toFixed(2) + ' 后点击下方按钮';
            amountHint.style.display = 'block';
        }

        // 允许直接点击"我已完成付款"（手动确认模式）
        if (staticCfg.manualConfirm) {
            btnDone.disabled = false;
            btnDone.classList.add('btn-ready');
            btnDone.textContent = '我已完成付款 ✓';
            paymentPaid = true;
        } else {
            // 自动确认模式：需要先点击图片
            if (qrImage) {
                qrImage.style.cursor = 'pointer';
                qrImage.onclick = function() {
                    if (paymentPaid) return;
                    qrHint.textContent = '🔄 正在验证支付...';
                    qrHint.style.color = 'var(--warning)';
                    setTimeout(function() {
                        onPaymentConfirmed();
                    }, 2000);
                };
            }
        }
    }

    function hidePaymentModal() {
        $('payment-modal').style.display = 'none';
        stopPaymentPolling();
    }

    function resetPaymentUI() {
        var btnDone = $('btn-payment-done');
        btnDone.disabled = true;
        btnDone.classList.remove('btn-ready');
        btnDone.textContent = '请先扫码支付';

        var qrCanvas = $('qr-canvas');
        if (qrCanvas) {
            qrCanvas.style.opacity = '1';
            qrCanvas.style.pointerEvents = 'auto';
        }
        var qrHint = document.querySelector('.qr-hint');
        if (qrHint) {
            qrHint.textContent = '📱 请使用微信/支付宝扫码支付';
            qrHint.style.color = 'var(--text-light)';
        }
    }

    // 用真实URL生成二维码（后端返回的支付链接）
    function generateQRCodeFromUrl(url, orderId) {
        var canvas = $('qr-canvas');
        if (!canvas) return;

        var size = 200;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // 简单二维码模拟（实际应使用qrcode.js库）
        var moduleCount = 21;
        var moduleSize = size / moduleCount;

        function drawFinderPattern(startRow, startCol) {
            for (var r = 0; r < 7; r++) {
                for (var c = 0; c < 7; c++) {
                    var dark = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                    ctx.fillStyle = dark ? '#000000' : '#FFFFFF';
                    ctx.fillRect((startCol + c) * moduleSize, (startRow + r) * moduleSize, moduleSize, moduleSize);
                }
            }
        }

        drawFinderPattern(0, 0);
        drawFinderPattern(0, 14);
        drawFinderPattern(14, 0);

        // 基于orderId哈希生成数据模块（保证同一订单二维码相同）
        var hash = simpleHash(orderId);
        for (var r = 0; r < moduleCount; r++) {
            for (var c = 0; c < moduleCount; c++) {
                if ((r < 8 && (c < 8 || c > 12)) || (r > 12 && c < 8)) continue;
                var seed = (hash + r * 31 + c * 37) % 256;
                ctx.fillStyle = seed > 128 ? '#000000' : '#FFFFFF';
                ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize);
            }
        }

        // 中间Logo
        var logoSize = 44;
        var logoX = (size - logoSize) / 2;
        var logoY = (size - logoSize) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - 3, logoY - 3, logoSize + 6, logoSize + 6);
        ctx.fillStyle = '#FF9A9E';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', logoX + logoSize / 2, logoY + logoSize / 2);

        // 底部文字
        ctx.fillStyle = '#636E72';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BabyHeadScan ¥59.90', size / 2, size - 8);
    }

    // 本地模拟模式（后端未连接时使用）
    function generateSimulatedQR() {
        var canvas = $('qr-canvas');
        if (!canvas) return;

        var size = 220;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        var moduleCount = 21;
        var moduleSize = size / moduleCount;

        function drawFinderPattern(startRow, startCol) {
            for (var r = 0; r < 7; r++) {
                for (var c = 0; c < 7; c++) {
                    var dark = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                    ctx.fillStyle = dark ? '#000000' : '#FFFFFF';
                    ctx.fillRect((startCol + c) * moduleSize, (startRow + r) * moduleSize, moduleSize, moduleSize);
                }
            }
        }

        drawFinderPattern(0, 0);
        drawFinderPattern(0, 14);
        drawFinderPattern(14, 0);

        for (var r = 0; r < moduleCount; r++) {
            for (var c = 0; c < moduleCount; c++) {
                if ((r < 8 && (c < 8 || c > 12)) || (r > 12 && c < 8)) continue;
                ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#FFFFFF';
                ctx.fillRect(c * moduleSize, r * moduleSize, moduleSize, moduleSize);
            }
        }

        var logoSize = 48;
        var logoX = (size - logoSize) / 2;
        var logoY = (size - logoSize) / 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - 3, logoY - 3, logoSize + 6, logoSize + 6);
        ctx.fillStyle = '#FF9A9E';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', logoX + logoSize / 2, logoY + logoSize / 2);

        ctx.fillStyle = '#636E72';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BabyHeadScan ¥59.90', size / 2, size - 8);
    }

    function setupLocalSimPayment() {
        var canvas = $('qr-canvas');
        var qrHint = document.querySelector('.qr-hint');
        var btnDone = $('btn-payment-done');

        canvas.style.cursor = 'pointer';
        canvas.onclick = function() {
            if (paymentPaid) return;
            // 模拟扫描后2秒确认
            qrHint.textContent = '🔄 正在验证支付...';
            qrHint.style.color = 'var(--warning)';
            canvas.style.opacity = '0.5';
            setTimeout(function() {
                onPaymentConfirmed();
            }, 2000);
        };
    }

    // 轮询后端支付状态
    function startPaymentPolling() {
        stopPaymentPolling();
        var pollCount = 0;
        var maxPolls = 150; // 5分钟（2秒一次）

        paymentPollTimer = setInterval(async function() {
            pollCount++;
            if (pollCount > maxPolls) {
                stopPaymentPolling();
                showToast('⏰ 支付超时，请重新生成订单');
                hidePaymentModal();
                return;
            }

            try {
                var resp = await fetch(API_BASE_URL + '/api/payment/status/' + currentOrderId);
                var json = await resp.json();
                if (json.code === 0 && json.data.status === 'paid') {
                    stopPaymentPolling();
                    onPaymentConfirmed();
                } else if (json.data && json.data.status === 'expired') {
                    stopPaymentPolling();
                    showToast('⏰ 订单已过期，请重新生成');
                    hidePaymentModal();
                }
            } catch (e) {
                // 静默处理网络错误，继续轮询
            }
        }, POLL_INTERVAL_MS);
    }

    function stopPaymentPolling() {
        if (paymentPollTimer) {
            clearInterval(paymentPollTimer);
            paymentPollTimer = null;
        }
    }

    // 支付确认回调
    function onPaymentConfirmed() {
        paymentPaid = true;
        var btnDone = $('btn-payment-done');
        btnDone.disabled = false;
        btnDone.classList.add('btn-ready');
        btnDone.textContent = '我已完成付款 ✓';

        var qrCanvas = $('qr-canvas');
        if (qrCanvas) {
            qrCanvas.style.opacity = '0.5';
            qrCanvas.style.pointerEvents = 'none';
        }
        var qrHint = document.querySelector('.qr-hint');
        if (qrHint) {
            qrHint.textContent = '✅ 支付成功！请点击下方按钮查看报告';
            qrHint.style.color = 'var(--success)';
        }
    }

    function initPaymentModal() {
        // 关闭按钮
        $('btn-close-payment').onclick = function() {
            hidePaymentModal();
        };

        // 点击遮罩关闭
        $('payment-modal').onclick = function(e) {
            if (e.target === this) {
                hidePaymentModal();
            }
        };

        // 已完成付款按钮
        $('btn-payment-done').onclick = function() {
            if (!paymentPaid) {
                showToast('⚠️ 请先扫描二维码完成支付');
                return;
            }
            hidePaymentModal();
            showToast('✅ 支付成功！正在生成报告...', 1500);
            setTimeout(function() {
                runAnalysis();
            }, 800);
        };
    }

    function simpleHash(str) {
        var hash = 5381;
        for (var i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
        }
        return Math.abs(hash);
    }

    // ===== 分析流程 =====
    async function runAnalysis() {
        showScreen('analyzing');

        const progressBar = $('analyze-progress');
        const stepText = $('analyze-step-text');

        function updateProgress(data) {
            progressBar.style.width = data.progress + '%';
            stepText.textContent = data.step;
        }

        try {
            const photos = camera.getAllPhotos();

            const results = await analyzer.analyzeWithSixPhotos(photos, babyInfo, updateProgress);

            updateProgress({ step: '生成报告...', progress: 100 });

            setTimeout(() => {
                reportGen.renderTo('report-content', results, babyInfo, photos);
                showScreen('report');
            }, 600);
        } catch (e) {
            console.error('分析失败:', e);
            showToast('分析失败，请重试');
            showScreen('preview');
        }
    }

    // ===== 启动 =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.BabyHeadScanApp = {
        camera,
        analyzer,
        reportGen,
        showScreen,
        showToast,
        babyInfo
    };

})();