// 智汇银桥 - 小程序入口
App({
  globalData: {
    userInfo: null,
    tabBarIndex: 0,
    // 课程列表全局状态（用于各页面联动）
    courseList: [],
    // 专家列表全局状态
    expertList: [],
    // 活动列表全局状态
    activityList: [],
    // 专家咨询记录（示例）
    expertRecords: [
      {
        id: 1,
        expert: '李教授',
        time: '2026年2月10日 15:00',
        question: '关于房产继承的遗嘱如何公证？',
        result: '已沟通：建议携带身份证、户口本、房产证及遗嘱草稿到公证处办理；可先致电当地公证处预约。'
      }
    ],
    // 适老化功能配置
    elderlySettings: {
      voiceEnabled: true,
      fontScale: 1.0,
      highContrast: true
    }
  },
  onLaunch() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.statusBarHeight = res.statusBarHeight
        this.globalData.windowHeight = res.windowHeight
      }
    })
    
    // 生成动态时间
    this.generateDynamicCourses()
    this.generateDynamicExperts()
    this.generateDynamicActivities()
    
    // 初始化一键登录
    this.initLogin()
    
    // 初始化语音功能
    this.initVoice()
    
    // 播放欢迎语音
    this.playWelcomeVoice()
  },
  
  // 生成动态活动时间
  generateDynamicActivities() {
    const now = new Date()
    const activities = [
      {
        id: 1,
        name: '社区植树节',
        place: '社区公园',
        enrolled: 12,
        total: 20,
        coverText: '🌳',
        status: 'available'
      },
      {
        id: 2,
        name: '青银读书会',
        place: '社区书院',
        enrolled: 8,
        total: 16,
        coverText: '📚',
        status: 'available'
      },
      {
        id: 3,
        name: '智慧助老志愿行',
        place: '社区广场',
        enrolled: 15,
        total: 20,
        coverText: '🤝',
        status: 'full'
      },
      {
        id: 4,
        name: '健康讲座',
        place: '社区活动室',
        enrolled: 20,
        total: 30,
        coverText: '🏥',
        status: 'available'
      },
      {
        id: 5,
        name: '智能手机培训',
        place: '社区书院',
        enrolled: 18,
        total: 25,
        coverText: '📱',
        status: 'available'
      }
    ]
    
    // 为每个活动生成动态时间
    const dynamicActivities = activities.map((activity, index) => {
      const activityDate = new Date(now)
      // 每个活动间隔1-7天
      activityDate.setDate(now.getDate() + (index + 1) * 2)
      
      const month = activityDate.getMonth() + 1
      const day = activityDate.getDate()
      const hour = 9 + index % 6 // 9-14点之间
      const minute = index % 2 === 0 ? 0 : 30
      
      const timeStr = `${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')}`
      
      return {
        ...activity,
        time: timeStr
      }
    })
    
    this.globalData.activityList = dynamicActivities
  },
  
  // 生成动态课程时间
  generateDynamicCourses() {
    const now = new Date()
    const courses = [
      {
        id: 1,
        name: '传统剪纸入门',
        place: '社区活动室',
        status: '可预约',
        statusClass: 'status-available',
        statusText: '可预约'
      },
      {
        id: 2,
        name: '书法启蒙课',
        place: '社区书院',
        status: '可预约',
        statusClass: 'status-available',
        statusText: '可预约'
      },
      {
        id: 3,
        name: '老故事会',
        place: '社区广场',
        status: '已结束',
        statusClass: 'status-ended',
        statusText: '已结束'
      },
      {
        id: 4,
        name: '国画入门',
        place: '社区书院',
        status: '约满',
        statusClass: 'status-full',
        statusText: '约满'
      }
    ]
    
    // 为每个课程生成动态时间
    const dynamicCourses = courses.map((course, index) => {
      const courseDate = new Date(now)
      // 已结束的课程设置为过去的时间
      if (course.status === '已结束') {
        courseDate.setDate(now.getDate() - 7)
      } else {
        // 其他课程设置为未来的时间
        courseDate.setDate(now.getDate() + (index + 1))
      }
      
      const month = courseDate.getMonth() + 1
      const day = courseDate.getDate()
      const hour = 10 + index % 5 // 10-14点之间
      const minute = 0
      
      const timeStr = `${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')}`
      
      return {
        ...course,
        time: timeStr
      }
    })
    
    this.globalData.courseList = dynamicCourses
  },
  
  // 生成动态专家时间
  generateDynamicExperts() {
    const now = new Date()
    const experts = [
      {
        id: 1,
        name: '李教授',
        avatarText: '李',
        title: '法律顾问',
        field: '遗产、赡养、消费维权',
        status: '可预约',
        statusClass: 'status-available',
        mySlot: ''
      },
      {
        id: 2,
        name: '王医生',
        avatarText: '王',
        title: '健康咨询',
        field: '慢病管理、用药指导',
        status: '可预约',
        statusClass: 'status-available',
        mySlot: ''
      },
      {
        id: 3,
        name: '张老师',
        avatarText: '张',
        title: '心理辅导',
        field: '情绪、家庭关系',
        status: '约满',
        statusClass: 'status-full',
        mySlot: ''
      }
    ]
    
    // 为每个专家生成动态时间
    const dynamicExperts = experts.map((expert, index) => {
      const expertDate = new Date(now)
      expertDate.setDate(now.getDate() + (index + 1))
      
      const month = expertDate.getMonth() + 1
      const day = expertDate.getDate()
      const hour = 14 + index % 3 // 14-16点之间
      const minute = 0
      
      const timeStr = `${month}月${day}日 ${hour}:${minute.toString().padStart(2, '0')}`
      
      return {
        ...expert,
        nextTime: timeStr
      }
    })
    
    this.globalData.expertList = dynamicExperts
  },
  
  // 一键登录
  initLogin() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userInfo']) {
          wx.authorize({
            scope: 'scope.userInfo',
            success: () => {
              this.getUserInfo()
            },
            fail: () => {
              console.log('用户拒绝授权')
            }
          })
        } else {
          this.getUserInfo()
        }
      }
    })
  },
  
  // 获取用户信息
  getUserInfo() {
    wx.getUserInfo({
      success: (res) => {
        this.globalData.userInfo = res.userInfo
      },
      fail: () => {
        console.log('获取用户信息失败')
      }
    })
  },
  
  // 初始化语音功能
  initVoice() {
    if (wx.getRecorderManager) {
      this.recorderManager = wx.getRecorderManager()
    }
    if (wx.createInnerAudioContext) {
      this.innerAudioContext = wx.createInnerAudioContext()
    }
  },
  
  // 播放欢迎语音
  playWelcomeVoice() {
    if (this.globalData.elderlySettings.voiceEnabled && this.innerAudioContext) {
      this.innerAudioContext.src = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=欢迎使用智汇银桥小程序，专为老年人设计的服务平台'
      this.innerAudioContext.play()
    }
  },
  
  // 语音播报
  speak(text) {
    if (this.globalData.elderlySettings.voiceEnabled && this.innerAudioContext) {
      this.innerAudioContext.src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_speech?text=${encodeURIComponent(text)}`
      this.innerAudioContext.play()
    }
  },
  
  // 开始录音
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
  
  // 停止录音
  stopRecord(callback) {
    if (this.recorderManager) {
      this.recorderManager.stop()
      this.recorderManager.onStop((res) => {
        if (callback) callback(res)
      })
    }
  }
})
