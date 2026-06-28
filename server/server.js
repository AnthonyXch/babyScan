/**
 * BabyHeadScan 后端服务
 * 提供支付订单创建、状态查询、支付确认API
 */

const express = require('express');
const cors = require('cors');
const payment = require('./payment');
const config = require('./config');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（收款码图片等）
app.use('/static', express.static(path.join(__dirname, 'public')));

// ====== 支付API ======

/**
 * POST /api/payment/create
 * 创建支付订单，返回订单信息和二维码URL
 */
app.post('/api/payment/create', (req, res) => {
  try {
    const order = payment.createOrder();
    console.log(`📝 新订单: ${order.orderId}, 金额: ¥${(order.amount / 100).toFixed(2)}`);
    
    res.json({
      code: 0,
      data: {
        orderId: order.orderId,
        qrCodeUrl: order.qrCodeUrl,
        amount: order.amount,
        status: order.status,
        expireAt: order.expireAt,
      }
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({ code: -1, message: '创建订单失败' });
  }
});

/**
 * GET /api/payment/status/:orderId
 * 查询订单支付状态（前端轮询用）
 */
app.get('/api/payment/status/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  const status = payment.getOrderStatus(orderId);
  if (!status) {
    return res.json({ code: -1, message: '订单不存在' });
  }
  
  res.json({
    code: 0,
    data: status,
  });
});

/**
 * GET /api/payment/confirm/:orderId
 * 测试模式：模拟用户扫码后确认支付
 * 前端生成的二维码指向此URL，用户扫码即确认支付
 */
app.get('/api/payment/confirm/:orderId', (req, res) => {
  if (config.mode !== 'test') {
    return res.status(403).json({ code: -1, message: '非测试模式不可用' });
  }
  
  const result = payment.confirmPayment(req.params.orderId);
  
  if (result.success) {
    // 返回HTML页面提示支付成功
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>支付成功</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
            background: linear-gradient(135deg, #E8F5E9, #F1F8E9);
          }
          .card {
            background: white; border-radius: 20px; padding: 40px 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1); text-align: center;
            max-width: 340px; width: 90%;
          }
          .icon { font-size: 64px; margin-bottom: 16px; }
          h2 { color: #00B894; margin: 0 0 8px; font-size: 22px; }
          p { color: #636E72; font-size: 14px; line-height: 1.6; }
          .amount { font-size: 28px; font-weight: 800; color: #2D3436; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>支付成功！</h2>
          <div class="amount">¥${(config.amount / 100).toFixed(2)}</div>
          <p>请返回 BabyHeadScan App 查看完整报告</p>
          <p>订单号: ${req.params.orderId}</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>支付失败</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h2 style="color:#E17055;">❌ ${result.message}</h2>
      </body>
      </html>
    `);
  }
});

/**
 * POST /api/payment/notify/wechat
 * 微信支付异步回调通知
 */
app.post('/api/payment/notify/wechat', (req, res) => {
  console.log('📩 收到微信支付回调');
  
  // TODO: 解析微信XML格式的通知数据
  // TODO: 验证签名
  // const result = payment.handlePaymentNotify('wechat', parsedData);
  
  // 微信要求返回成功才停止重复通知
  res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>');
});

/**
 * POST /api/payment/notify/alipay
 * 支付宝异步回调通知
 */
app.post('/api/payment/notify/alipay', (req, res) => {
  console.log('📩 收到支付宝回调');
  
  // TODO: 验证签名
  // const result = payment.handlePaymentNotify('alipay', req.body);
  
  res.send('success');
});

// ====== 配置API ======

/**
 * GET /api/config
 * 返回支付相关配置（含静态收款码设置）
 */
app.get('/api/config', (req, res) => {
  res.json({
    code: 0,
    data: {
      mode: config.mode,
      amount: config.amount,
      staticQR: config.staticQR,
      expireSeconds: config.expireSeconds,
    }
  });
});

// ====== 健康检查 ======
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: config.mode,
    time: new Date().toISOString(),
  });
});

// ====== 启动服务 ======
app.listen(config.port, () => {
  console.log('═══════════════════════════════════════');
  console.log('  🍼 BabyHeadScan 后端服务已启动');
  console.log(`  📡 端口: ${config.port}`);
  console.log(`  💳 支付模式: ${config.mode}`);
  console.log(`  💰 金额: ¥${(config.amount / 100).toFixed(2)}`);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('  API 端点:');
  console.log(`  POST 创建订单:  http://localhost:${config.port}/api/payment/create`);
  console.log(`  GET  状态查询:  http://localhost:${config.port}/api/payment/status/:orderId`);
  console.log(`  GET  支付确认:  http://localhost:${config.port}/api/payment/confirm/:orderId`);
  console.log('');
  console.log('  切换生产模式: 修改 server/config.js 中的 mode 字段');
  console.log('═══════════════════════════════════════');
});