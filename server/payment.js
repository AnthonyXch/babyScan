/**
 * 支付模块
 * 支持测试模式、微信支付、支付宝
 */

const config = require('./config');

// 内存存储订单（生产环境应使用数据库）
const orders = new Map();

// 订单ID生成器
let orderSeq = 0;
function generateOrderId() {
  orderSeq++;
  const now = Date.now();
  return 'BHS' + now.toString(36).toUpperCase() + orderSeq.toString(36).toUpperCase();
}

/**
 * 创建支付订单
 * @returns {{ orderId, qrCodeUrl, amount, status, expireAt }}
 */
function createOrder() {
  const orderId = generateOrderId();
  const order = {
    orderId,
    amount: config.amount,
    status: 'pending',  // pending | paid | expired | cancelled
    createdAt: Date.now(),
    expireAt: Date.now() + config.expireSeconds * 1000,
    paidAt: null,
    paymentMode: config.mode,
  };
  
  orders.set(orderId, order);
  
  // 根据支付模式生成二维码URL
  let qrCodeUrl;
  if (config.mode === 'test') {
    // 测试模式：返回本地支付确认URL
    qrCodeUrl = `http://localhost:${config.port}/api/payment/confirm/${orderId}`;
  } else {
    // 生产模式：返回支付平台生成的二维码URL
    qrCodeUrl = generateProductionQR(order);
  }
  
  return {
    orderId: order.orderId,
    qrCodeUrl,
    amount: order.amount,
    status: order.status,
    expireAt: order.expireAt,
  };
}

/**
 * 生产模式 - 生成支付二维码（需对接真实API）
 */
function generateProductionQR(order) {
  if (config.mode === 'wechat') {
    // TODO: 调用微信支付统一下单API
    // 返回 code_url 用于生成二维码
    return 'WECHAT_QR_PLACEHOLDER';
  } else if (config.mode === 'alipay') {
    // TODO: 调用支付宝预下单API
    // 返回 qr_code 用于生成二维码
    return 'ALIPAY_QR_PLACEHOLDER';
  }
  return '';
}

/**
 * 查询订单状态
 */
function getOrderStatus(orderId) {
  const order = orders.get(orderId);
  if (!order) return null;
  
  // 检查是否过期
  if (order.status === 'pending' && Date.now() > order.expireAt) {
    order.status = 'expired';
  }
  
  return {
    orderId: order.orderId,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    expireAt: order.expireAt,
    paidAt: order.paidAt,
  };
}

/**
 * 模拟支付确认（测试模式）
 * 用户扫描二维码后调用的接口
 */
function confirmPayment(orderId) {
  const order = orders.get(orderId);
  if (!order) return { success: false, message: '订单不存在' };
  
  if (order.status === 'paid') {
    return { success: true, message: '已支付' };
  }
  
  if (order.status === 'expired') {
    return { success: false, message: '订单已过期' };
  }
  
  if (Date.now() > order.expireAt) {
    order.status = 'expired';
    return { success: false, message: '订单已过期' };
  }
  
  // 确认支付
  order.status = 'paid';
  order.paidAt = Date.now();
  
  console.log(`✅ 订单 ${orderId} 支付成功！金额: ¥${(order.amount / 100).toFixed(2)}`);
  
  return { success: true, message: '支付成功', paidAt: order.paidAt };
}

/**
 * 支付通知回调（微信/支付宝异步通知）
 */
function handlePaymentNotify(platform, data) {
  console.log(`📩 收到 ${platform} 支付通知:`, JSON.stringify(data));
  
  const orderId = data.out_trade_no || data.orderId;
  const order = orders.get(orderId);
  
  if (!order) {
    console.warn(`⚠️ 未找到订单: ${orderId}`);
    return false;
  }
  
  if (order.status === 'paid') {
    return true; // 已支付，幂等返回
  }
  
  // 验证签名（生产环境必须）
  // TODO: 实现签名验证
  
  order.status = 'paid';
  order.paidAt = Date.now();
  console.log(`✅ 订单 ${orderId} 支付成功（异步通知）`);
  
  return true;
}

/**
 * 清理过期订单（定期调用）
 */
function cleanExpiredOrders() {
  const now = Date.now();
  for (const [orderId, order] of orders) {
    if (order.status === 'pending' && now > order.expireAt) {
      order.status = 'expired';
    }
  }
}

// 每60秒清理一次过期订单
setInterval(cleanExpiredOrders, 60000);

module.exports = {
  createOrder,
  getOrderStatus,
  confirmPayment,
  handlePaymentNotify,
  config,
};