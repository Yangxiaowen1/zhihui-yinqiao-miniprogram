const app = getApp()

Page({
  data: {
    silverMode: false,
    userInfo: {},
    roleText: ''
  },
  
  onLoad() {
    this.setData({
      silverMode: app.globalData.silverMode
    })
    
    app.onSilverModeChange(this.onSilverModeChanged)
  },
  
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    
    // 每次显示时刷新用户信息
    this.loadUserInfo()
  },
  
  onUnload() {
    app.offSilverModeChange(this.onSilverModeChanged)
  },
  
  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo || {}
    const roleTextMap = {
      'parent': '家长',
      'expert': '银龄导师',
      'volunteer': '青年志愿者'
    }
    
    this.setData({
      userInfo: userInfo,
      roleText: roleTextMap[userInfo.role] || '用户'
    })
  },
  
  // 银龄模式变更回调
  onSilverModeChanged(enabled) {
    this.setData({ silverMode: enabled })
  },
  
  // 切换银龄模式
  toggleSilverMode(e) {
    const enabled = e.detail.value
    app.toggleSilverMode(enabled)
    this.setData({ silverMode: enabled })
  },
  
  // 跳转编辑资料
  goEditProfile() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    })
  },
  
  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('loginTime')
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          
          wx.showToast({ title: '已退出登录', icon: 'success' })
          
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' })
          }, 500)
        }
      }
    })
  }
})
