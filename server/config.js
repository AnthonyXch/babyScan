/**
 * BabyHeadScan 支付配置
 * 
 * 模式说明:
 *   'test'   - 测试模式: 模拟完整支付流程，前端扫码后5秒自动确认
 *   'wechat' - 微信支付: 需填写下方 wechat 配置
 *   'alipay' - 支付宝: 需填写下方 alipay 配置
 */

module.exports = {
  // ===== 基础配置 =====
  mode: 'test',  // 'test' | 'wechat' | 'alipay'
  
  // 服务端口
  port: 3456,
  
  // 支付金额（分）
  amount: 5990,  // ¥59.90 = 5990分
  
  // 支付超时时间（秒）
  expireSeconds: 300,  // 5分钟
  
  // 支付轮询间隔（前端用）
  pollIntervalMs: 2000,  // 2秒
  
  // ===== 微信支付配置（mode: 'wechat' 时生效）=====
  wechat: {
    appId: 'YOUR_WECHAT_APP_ID',
    mchId: 'YOUR_WECHAT_MCH_ID',
    apiKey: 'YOUR_WECHAT_API_KEY',
    notifyUrl: 'https://your-domain.com/api/payment/notify/wechat',
    // 证书路径（退款等敏感操作需要）
    certPath: '',
    keyPath: '',
  },
  
  // ===== 支付宝配置（mode: 'alipay' 时生效）=====
  alipay: {
    appId: 'YOUR_ALIPAY_APP_ID',
    privateKey: 'YOUR_ALIPAY_PRIVATE_KEY',
    alipayPublicKey: 'YOUR_ALIPAY_PUBLIC_KEY',
    notifyUrl: 'https://your-domain.com/api/payment/notify/alipay',
    // 支付宝网关
    gateway: 'https://openapi.alipay.com/gateway.do',
  },
  
  // ===== 模拟支付配置（mode: 'test' 时生效）=====
  test: {
    // 模拟支付确认延迟（毫秒），模拟用户扫码支付的时间
    confirmDelayMs: 5000,
  }
};