// 智汇银桥 - 小程序入口
App({
  globalData: {
    userInfo: null,
    tabBarIndex: 0,
    // 课程列表全局状态
    courseList: [],
    // 专家列表全局状态
    expertList: [],
    // 活动列表全局状态
    activityList: [],
    // 专家咨询记录
    expertRecords: [],
    // 适老化功能配置
    elderlySettings: {
      voiceEnabled: true,
      fontScale: 1.0,
      highContrast: true
    },
    // 银龄模式配置
    silverMode: false,
    silverModeCallbacks: [],
    // 云环境ID
    cloudEnvId: 'cloud1-9gptrmt8c56cfdf0'
  },
  
  onLaunch() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请升级微信开发者工具基础库到2.2.3以上版本以支持云开发')
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnvId,
        traceUser: true
      })
      console.log('云环境初始化成功')
    }
    
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.statusBarHeight = res.statusBarHeight
        this.globalData.windowHeight = res.windowHeight
      }
    })
    
    // 初始化语音功能
    this.initVoice()
    
    // 初始化银龄模式
    this.initSilverMode()
    
    // 尝试自动登录
    this.autoLogin()
  },
  
  // ========== 云函数调用封装 ==========
  
  /**
   * 统一调用云函数
   */
  async callCloudFunction(name, action, data = {}) {
    try {
      const res = await wx.cloud.callFunction({
        name,
        data: { action, data }
      })
      return res.result
    } catch (err) {
      console.error(`云函数 ${name} 调用失败:`, err)
      throw err
    }
  },
  
  // ========== 用户相关 ==========
  
  /**
   * 自动登录
   */
  async autoLogin() {
    try {
      const res = await this.callCloudFunction('user', 'login', {})
      if (res.success) {
        this.globalData.userInfo = res.data
        this.globalData.silverMode = res.data.silverMode || false
        this.globalData.elderlySettings = res.data.elderlySettings || this.globalData.elderlySettings
        
        // 保存到本地
        wx.setStorageSync('userInfo', res.data)
        
        console.log('自动登录成功:', res.isNewUser ? '新用户' : '老用户')
        return res
      }
    } catch (err) {
      console.error('自动登录失败:', err)
    }
  },
  
  /**
   * 手动登录
   */
  async login() {
    const res = await this.callCloudFunction('user', 'login', {})
    if (res.success) {
      this.globalData.userInfo = res.data
      wx.setStorageSync('userInfo', res.data)
    }
    return res
  },
  
  /**
   * 更新用户设置
   */
  async updateUserSettings(data) {
    const res = await this.callCloudFunction('user', 'updateSettings', data)
    if (res.success && this.globalData.userInfo) {
      if (data.silverMode !== undefined) {
        this.globalData.userInfo.silverMode = data.silverMode
      }
      if (data.elderlySettings) {
        this.globalData.userInfo.elderlySettings = data.elderlySettings
      }
    }
    return res
  },
  
  /**
   * 获取用户信息
   */
  async getUserInfo() {
    const res = await this.callCloudFunction('user', 'getUserInfo', {})
    if (res.success) {
      this.globalData.userInfo = res.data
    }
    return res
  },
  
  // ========== 课程相关 ==========
  
  /**
   * 获取课程列表
   */
  async getCourseList(data = {}) {
    const res = await this.callCloudFunction('course', 'list', data)
    if (res.success) {
      this.globalData.courseList = res.data.list
    }
    return res
  },
  
  /**
   * 获取课程详情
   */
  async getCourseDetail(courseId) {
    return await this.callCloudFunction('course', 'detail', { id: courseId })
  },
  
  /**
   * 报名课程
   */
  async registerCourse(data) {
    return await this.callCloudFunction('course', 'register', data)
  },
  
  // ========== 专家相关 ==========
  
  /**
   * 获取专家列表
   */
  async getExpertList(data = {}) {
    const res = await this.callCloudFunction('expert', 'list', data)
    if (res.success) {
      this.globalData.expertList = res.data.list
    }
    return res
  },
  
  /**
   * 获取专家详情
   */
  async getExpertDetail(expertId) {
    return await this.callCloudFunction('expert', 'detail', { id: expertId })
  },
  
  /**
   * 获取专家可预约时段
   */
  async getExpertSlots(expertId) {
    return await this.callCloudFunction('expert', 'getSlots', { expertId })
  },
  
  /**
   * 预约专家
   */
  async bookExpert(data) {
    return await this.callCloudFunction('expert', 'book', data)
  },
  
  /**
   * 获取咨询记录
   */
  async getConsultRecords(data = {}) {
    return await this.callCloudFunction('expert', 'getRecords', data)
  },
  
  // ========== 活动相关 ==========
  
  /**
   * 获取活动列表
   */
  async getActivityList(data = {}) {
    const res = await this.callCloudFunction('activity', 'list', data)
    if (res.success) {
      this.globalData.activityList = res.data.list
    }
    return res
  },
  
  /**
   * 获取活动详情
   */
  async getActivityDetail(activityId) {
    return await this.callCloudFunction('activity', 'detail', { id: activityId })
  },
  
  /**
   * 活动报名
   */
  async registerActivity(data) {
    return await this.callCloudFunction('activity', 'register', data)
  },
  
  /**
   * 创建组队
   */
  async createTeam(data) {
    return await this.callCloudFunction('activity', 'createTeam', data)
  },
  
  /**
   * 加入组队
   */
  async joinTeam(teamId) {
    return await this.callCloudFunction('activity', 'joinTeam', { teamId })
  },
  
  // ========== 报名管理 ==========
  
  /**
   * 获取我的报名列表
   */
  async getMyRegistrations(data = {}) {
    return await this.callCloudFunction('registration', 'list', data)
  },
  
  /**
   * 获取报名详情
   */
  async getRegistrationDetail(registrationId) {
    return await this.callCloudFunction('registration', 'detail', { id: registrationId })
  },
  
  /**
   * 扫码签到
   */
  async scanAttendance(data) {
    return await this.callCloudFunction('registration', 'scan', data)
  },
  
  /**
   * 获取统计数据
   */
  async getStatistics() {
    return await this.callCloudFunction('registration', 'getStatistics', {})
  },
  
  // ========== 消息通知 ==========
  
  /**
   * 获取消息列表
   */
  async getNotifications(data = {}) {
    return await this.callCloudFunction('notification', 'list', data)
  },
  
  /**
   * 标记消息已读
   */
  async markNotificationRead(notificationId) {
    return await this.callCloudFunction('notification', 'markRead', { notificationId })
  },
  
  /**
   * 标记所有消息已读
   */
  async markAllNotificationsRead() {
    return await this.callCloudFunction('notification', 'markAllRead', {})
  },
  
  /**
   * 获取未读消息数
   */
  async getUnreadCount() {
    return await this.callCloudFunction('notification', 'getUnreadCount', {})
  },
  
  // ========== 银龄模式 ==========
  
  /**
   * 初始化银龄模式（从本地存储读取）
   */
  initSilverMode() {
    const savedMode = wx.getStorageSync('silverMode')
    if (savedMode !== '' && savedMode !== null) {
      this.globalData.silverMode = savedMode
    }
  },
  
  /**
   * 切换银龄模式
   */
  async toggleSilverMode(enabled) {
    this.globalData.silverMode = enabled
    wx.setStorageSync('silverMode', enabled)
    
    // 触发所有注册的回调函数
    this.globalData.silverModeCallbacks.forEach(callback => {
      if (typeof callback === 'function') {
        callback(enabled)
      }
    })
    
    // 同步到服务器
    await this.updateUserSettings({ silverMode: enabled })
    
    // 语音提示
    if (this.globalData.elderlySettings.voiceEnabled) {
      const msg = enabled ? '银龄模式已开启，界面字体已放大，功能已精简' : '银龄模式已关闭'
      this.speak(msg)
    }
    
    console.log('银龄模式切换:', enabled)
  },
  
  /**
   * 注册银龄模式变更回调
   */
  onSilverModeChange(callback) {
    if (typeof callback === 'function') {
      this.globalData.silverModeCallbacks.push(callback)
    }
  },
  
  /**
   * 取消银龄模式变更回调
   */
  offSilverModeChange(callback) {
    const index = this.globalData.silverModeCallbacks.indexOf(callback)
    if (index > -1) {
      this.globalData.silverModeCallbacks.splice(index, 1)
    }
  },
  
  // ========== 语音功能 ==========
  
  /**
   * 初始化语音功能
   */
  initVoice() {
    if (wx.getRecorderManager) {
      this.recorderManager = wx.getRecorderManager()
    }
    if (wx.createInnerAudioContext) {
      this.innerAudioContext = wx.createInnerAudioContext()
    }
  },
  
  /**
   * 语音播报
   */
  speak(text) {
    if (this.globalData.elderlySettings.voiceEnabled && this.innerAudioContext) {
      this.innerAudioContext.src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=${encodeURIComponent(text)}`
      this.innerAudioContext.play()
    }
  },
  
  /**
   * 开始录音
   */
  startRecord() {
    if (this.recorderManager) {
      const options = {
        duration: 60000,
        sampleRate: 44100,
        numberOfChannels: 1,
        encodeBitRate: 192000,
        format: 'mp3',
        frameSize: 50
      }
      this.recorderManager.start(options)
    }
  },
  
  /**
   * 停止录音
   */
  stopRecord(callback) {
    if (this.recorderManager) {
      this.recorderManager.stop()
      this.recorderManager.onStop((res) => {
        if (callback) callback(res)
      })
    }
  }
})
