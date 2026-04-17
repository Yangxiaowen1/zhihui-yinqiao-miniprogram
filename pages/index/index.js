const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    silverMode: false,
    userRole: '',
    userInfo: {},
    expertProfile: {},
    volunteerStats: {},
    recommendCourses: [],
    recommendActivities: [],
    pendingOrdersList: [],
    pendingOrders: 0
  },

  onLoad() {
    this.checkLoginStatus()
    
    this.setData({
      silverMode: app.globalData.silverMode
    })
    
    app.onSilverModeChange(this.onSilverModeChanged.bind(this))
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    
    // 每次显示时刷新数据
    this.loadUserData()
  },

  onUnload() {
    app.offSilverModeChange(this.onSilverModeChanged.bind(this))
  },

  onSilverModeChanged(enabled) {
    this.setData({ silverMode: enabled })
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const loginTime = wx.getStorageSync('loginTime')
    
    if (userInfo && loginTime) {
      const now = Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      
      if (now - loginTime < sevenDays) {
        app.globalData.userInfo = userInfo
        app.globalData.isLoggedIn = true
        
        this.setData({
          isLoggedIn: true,
          userInfo: userInfo,
          userRole: userInfo.role
        })
        
        // 根据角色加载数据
        this.loadRoleData(userInfo.role)
      } else {
        this.setData({ isLoggedIn: false })
      }
    } else {
      this.setData({ isLoggedIn: false })
    }
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userRole: userInfo.role,
        isLoggedIn: true
      })
      this.loadRoleData(userInfo.role)
    }
  },

  // 根据角色加载数据
  loadRoleData(role) {
    switch (role) {
      case 'parent':
        this.loadParentData()
        break
      case 'expert':
        this.loadExpertData()
        break
      case 'volunteer':
        this.loadVolunteerData()
        break
    }
  },

  // 加载家长数据
  async loadParentData() {
    try {
      // 获取推荐课程
      const courseRes = await wx.cloud.callFunction({
        name: 'course',
        data: { action: 'list', data: { limit: 3 } }
      })
      
      if (courseRes.result && courseRes.result.success) {
        this.setData({
          recommendCourses: courseRes.result.data.list
        })
      }
    } catch (err) {
      console.error('加载家长数据失败:', err)
    }
  },

  // 加载导师数据
  async loadExpertData() {
    try {
      // 获取导师档案
      const profileRes = await wx.cloud.callFunction({
        name: 'expertProfile',
        data: { action: 'getProfile' }
      })
      
      if (profileRes.result && profileRes.result.success) {
        this.setData({
          expertProfile: profileRes.result.data
        })
      }

      // 获取统计数据
      const statsRes = await wx.cloud.callFunction({
        name: 'expertProfile',
        data: { action: 'getStatistics' }
      })
      
      if (statsRes.result && statsRes.result.success) {
        this.setData({
          pendingOrders: statsRes.result.data.pendingOrders
        })
      }

      // 获取待处理订单
      const ordersRes = await wx.cloud.callFunction({
        name: 'order',
        data: { action: 'getPendingOrders' }
      })
      
      if (ordersRes.result && ordersRes.result.success) {
        this.setData({
          pendingOrdersList: ordersRes.result.data
        })
      }
    } catch (err) {
      console.error('加载导师数据失败:', err)
    }
  },

  // 加载志愿者数据
  async loadVolunteerData() {
    try {
      // 获取统计数据
      const statsRes = await wx.cloud.callFunction({
        name: 'volunteer',
        data: { action: 'getStatistics' }
      })
      
      if (statsRes.result && statsRes.result.success) {
        this.setData({
          volunteerStats: statsRes.result.data
        })
      }

      // 获取推荐活动
      const activityRes = await wx.cloud.callFunction({
        name: 'volunteer',
        data: { action: 'getActivities', data: { limit: 3 } }
      })
      
      if (activityRes.result && activityRes.result.success) {
        this.setData({
          recommendActivities: activityRes.result.data
        })
      }
    } catch (err) {
      console.error('加载志愿者数据失败:', err)
    }
  },

  // 跳转登录
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  // ========== 通用跳转 ==========
  goCourse() {
    wx.navigateTo({ url: '/pages/course/list/list' })
  },

  goCourseDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course/detail/detail?id=${id}` })
  },

  goMyRegistrations() {
    wx.navigateTo({ url: '/pages/my-registrations/my-registrations' })
  },

  goCreditArchive() {
    wx.navigateTo({ url: '/pages/credit-archive/credit-archive' })
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // ========== 家长专属跳转 ==========
  goMyOrders() {
    wx.navigateTo({ url: '/pages/my-registrations/my-registrations?type=course' })
  },

  goMyChildren() {
    wx.showToast({ title: '子女管理功能开发中', icon: 'none' })
  },

  goExpertList() {
    wx.navigateTo({ url: '/pages/expert/list/list' })
  },

  // ========== 导师专属跳转 ==========
  goMyCourses() {
    wx.showToast({ title: '我的课程功能开发中', icon: 'none' })
  },

  goPendingOrders() {
    wx.navigateTo({ url: '/pages/my-registrations/my-registrations?type=order' })
  },

  goServiceRecords() {
    wx.showToast({ title: '服务记录功能开发中', icon: 'none' })
  },

  goEarnings() {
    wx.showToast({ title: '收益统计功能开发中', icon: 'none' })
  },

  // 确认订单
  async confirmOrder(e) {
    const orderId = e.currentTarget.dataset.id
    try {
      const res = await wx.cloud.callFunction({
        name: 'order',
        data: { action: 'confirm', data: { orderId } }
      })
      
      if (res.result && res.result.success) {
        wx.showToast({ title: '确认成功', icon: 'success' })
        this.loadExpertData()
      }
    } catch (err) {
      wx.showToast({ title: '确认失败', icon: 'none' })
    }
  },

  // ========== 志愿者专属跳转 ==========
  goActivities() {
    wx.navigateTo({ url: '/pages/activity/list/list' })
  },

  goActivityDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activity/detail/detail?id=${id}` })
  },

  goVolunteerTasks() {
    wx.showToast({ title: '助老任务功能开发中', icon: 'none' })
  },

  goMyHours() {
    wx.showToast({ title: '志愿时长功能开发中', icon: 'none' })
  },

  goTeamActivities() {
    wx.navigateTo({ url: '/pages/activity/list/list?type=team' })
  },

  // ========== 银龄模式功能 ==========
  voiceAssist() {
    wx.showModal({
      title: '语音助手',
      content: '您好！我是您的智能助手，请问有什么可以帮助您的？',
      confirmText: '开始语音',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.startRecord()
          wx.showToast({
            title: '正在录音...',
            icon: 'none',
            duration: 60000
          })
          setTimeout(() => {
            app.stopRecord(() => {
              wx.hideToast()
              wx.showModal({
                title: '语音助手',
                content: '您可以说："我想报名课程"、"找专家咨询"或"查看活动"',
                showCancel: false
              })
            })
          }, 3000)
        }
      }
    })
  },

  emergencyCall() {
    wx.showModal({
      title: '紧急呼叫',
      content: '确定要拨打紧急电话吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '120',
            success: () => {
              console.log('拨打电话成功')
            },
            fail: () => {
              console.log('拨打电话失败')
            }
          })
        }
      }
    })
  }
})
