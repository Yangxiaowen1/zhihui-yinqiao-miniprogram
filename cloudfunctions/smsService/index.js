// 短信验证码服务云函数
// 支持发送验证码、验证验证码、解密微信手机号

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 验证码存储集合名
const CODE_COLLECTION = 'sms_codes'

/**
 * 生成6位随机验证码
 */
function generateCode() {
  return Math.random().toString().slice(-6)
}

/**
 * 发送短信验证码
 * 方式1: 使用微信云调用 (需要开通)
 * 方式2: 使用第三方短信服务 (如腾讯云短信)
 */
async function sendSmsCode(phone) {
  // 生成6位验证码
  const code = generateCode()
  
  // 验证码有效期5分钟
  const expireTime = Date.now() + 5 * 60 * 1000
  
  // 存储验证码到数据库
  try {
    // 先删除该手机号的旧验证码
    await db.collection(CODE_COLLECTION).where({
      phone: phone
    }).remove()
    
    // 插入新验证码
    await db.collection(CODE_COLLECTION).add({
      data: {
        phone: phone,
        code: code,
        expireTime: expireTime,
        createTime: db.serverDate(),
        used: false
      }
    })
    
    // ========== 发送短信 ==========
    // 方式1: 使用微信云调用发送短信 (推荐)
    // 需要在云开发控制台开通短信服务
    try {
      await cloud.openapi.cloudbase.sendSms({
        env: cloud.DYNAMIC_CURRENT_ENV,
        phoneNumber: '+86' + phone,
        smsType: 'miniprogram',
        templateId: '您的短信模板ID', // 需要在短信服务中创建模板
        param: {
          code: code
        }
      })
      
      return { success: true, message: '验证码已发送' }
    } catch (smsError) {
      console.log('云调用发送短信失败，使用开发模式:', smsError.message)
      
      // 开发环境：打印验证码到控制台
      console.log('========== 验证码 ==========')
      console.log('手机号:', phone)
      console.log('验证码:', code)
      console.log('有效期:', '5分钟')
      console.log('============================')
      
      // 开发环境返回验证码（生产环境需删除）
      return { 
        success: true, 
        message: '验证码已发送',
        devCode: code  // 仅开发环境返回
      }
    }
    
  } catch (err) {
    console.error('存储验证码失败:', err)
    return { success: false, message: '发送失败，请重试' }
  }
}

/**
 * 验证短信验证码
 */
async function verifySmsCode(phone, code) {
  try {
    const res = await db.collection(CODE_COLLECTION).where({
      phone: phone,
      code: code,
      used: false,
      expireTime: _.gt(Date.now())
    }).get()
    
    if (res.data.length === 0) {
      return { success: false, message: '验证码错误或已过期' }
    }
    
    // 标记验证码已使用
    await db.collection(CODE_COLLECTION).doc(res.data[0]._id).update({
      data: { used: true }
    })
    
    return { success: true, message: '验证成功' }
  } catch (err) {
    console.error('验证失败:', err)
    return { success: false, message: '验证失败，请重试' }
  }
}

/**
 * 解密微信手机号
 */
async function decryptPhoneNumber(cloudID) {
  try {
    const res = await cloud.getOpenData({
      list: [cloudID]
    })
    
    if (res.list && res.list[0] && res.list[0].data) {
      const phoneNumber = res.list[0].data.phoneNumber
      return { success: true, phone: phoneNumber }
    }
    
    return { success: false, message: '解密失败' }
  } catch (err) {
    console.error('解密手机号失败:', err)
    return { success: false, message: '解密失败' }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, phone, code, cloudID } = event
  
  switch (action) {
    case 'send':
      return await sendSmsCode(phone)
    
    case 'verify':
      return await verifySmsCode(phone, code)
    
    case 'decrypt':
      return await decryptPhoneNumber(cloudID)
    
    default:
      return { success: false, message: '未知操作' }
  }
}
