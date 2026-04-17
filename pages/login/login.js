// 智汇银桥 - 简化登录页
const app = getApp()

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    agreed: false
  },

  onLoad(options) {
    this.checkSavedLogin()
  },

  checkSavedLogin() {
    const userInfo = wx.getStorageSync('userInfo')
    const loginTime = wx.getStorageSync('loginTime')
    
    if (userInfo && loginTime) {
      const now = Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      
      if (now - loginTime < sevenDays) {
        app.globalData.userInfo = userInfo
        app.globalData.isLoggedIn = true
        wx.switchTab({ url: '/pages/index/index' })
      }
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  // 发送验证码
  sendCode() {
    const { phone, countdown } = this.data
    
    if (countdown > 0) return
    if (!this.validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })

    // 调用云函数发送验证码
    wx.cloud.callFunction({
      name: 'smsService',
      data: { action: 'send', phone }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result && res.result.success) {
        // 开发环境显示验证码
        if (res.result.devCode) {
          wx.showModal({
            title: '验证码',
            content: `验证码: ${res.result.devCode}\n(开发环境)`,
            showCancel: false
          })
        } else {
          wx.showToast({ title: '验证码已发送', icon: 'success' })
        }
        
        // 开始倒计时
        this.setData({ countdown: 60 })
        this.timer = setInterval(() => {
          if (this.data.countdown <= 0) {
            clearInterval(this.timer)
          } else {
            this.setData({ countdown: this.data.countdown - 1 })
          }
        }, 1000)
      } else {
        wx.showToast({ title: res.result?.message || '发送失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('发送验证码失败:', err)
      wx.showToast({ title: '发送失败，请重试', icon: 'none' })
    })
  },

  // 登录
  login() {
    const { phone, code, agreed } = this.data

    if (!this.validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' })
      return
    }
    if (!agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return
    }

    wx.showLoading({ title: '验证中...' })

    // 验证验证码
    wx.cloud.callFunction({
      name: 'smsService',
      data: { action: 'verify', phone, code }
    }).then(res => {
      if (res.result && res.result.success) {
        this.checkUserRegistration(phone)
      } else {
        wx.hideLoading()
        wx.showToast({ title: res.result?.message || '验证码错误', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('验证失败:', err)
      wx.showToast({ title: '验证失败', icon: 'none' })
    })
  },

  // 微信快捷登录
  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '您拒绝了授权', icon: 'none' })
      return
    }
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return
    }

    wx.showLoading({ title: '登录中...' })

    // 调用云函数解密手机号
    wx.cloud.callFunction({
      name: 'smsService',
      data: { 
        action: 'decrypt', 
        cloudID: e.detail.cloudID 
      }
    }).then(res => {
      if (res.result && res.result.success && res.result.phone) {
        this.checkUserRegistration(res.result.phone)
      } else {
        wx.hideLoading()
        wx.showToast({ title: '获取手机号失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('解密失败:', err)
      wx.showToast({ title: '登录失败', icon: 'none' })
    })
  },

  // 检查用户是否已注册
  checkUserRegistration(phone) {
    wx.cloud.database().collection('users').where({ phone }).get().then(res => {
      wx.hideLoading()
      
      if (res.data.length > 0) {
        // 已注册，直接登录
        this.loginSuccess(res.data[0])
      } else {
        // 未注册，跳转角色选择
        wx.navigateTo({
          url: `/pages/register/role-select/role-select?phone=${phone}`
        })
      }
    }).catch(() => {
      wx.hideLoading()
      wx.navigateTo({
        url: `/pages/register/role-select/role-select?phone=${phone}`
      })
    })
  },

  // 登录成功
  loginSuccess(userInfo) {
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('loginTime', Date.now())
    
    app.globalData.userInfo = userInfo
    app.globalData.isLoggedIn = true
    
    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 500)
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  goUserAgreement() {
    wx.navigateTo({ url: '/pages/agreement/user-agreement' })
  },

  goPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/agreement/privacy-policy' })
  },

  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})
