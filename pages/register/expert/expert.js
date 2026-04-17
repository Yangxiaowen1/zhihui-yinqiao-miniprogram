// 智汇银桥 - 银龄导师注册表单（简化版）
const app = getApp()

Page({
  data: {
    phone: '',
    communityIndex: -1,
    communities: ['阳光社区', '幸福社区', '和谐社区', '文明社区', '康乐社区', '安宁社区', '繁荣社区', '花园社区'],
    name: '',
    ageIndex: -1,
    ageRange: [],
    expertiseIndex: [-1],
    expertiseOptions: [
      ['教育辅导', '心理咨询', '健康养生', '法律咨询', '文化艺术', '手工制作', '体育健身', '其他']
    ],
    availableTimes: {
      morning: false,
      afternoon: false,
      evening: false,
      weekend: false
    }
  },

  onLoad(options) {
    if (options.phone) {
      this.setData({ phone: options.phone })
    }
    this.initAgeRange()
  },

  initAgeRange() {
    const ageRange = []
    for (let i = 55; i <= 80; i++) {
      ageRange.push(i + '岁')
    }
    this.setData({ ageRange })
  },

  onCommunityChange(e) {
    this.setData({ communityIndex: e.detail.value })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onAgeChange(e) {
    this.setData({ ageIndex: e.detail.value })
  },

  onExpertiseChange(e) {
    this.setData({ expertiseIndex: e.detail.value })
  },

  onExpertiseColumnChange(e) {
    // 单列选择器，无需处理
  },

  toggleTime(e) {
    const time = e.currentTarget.dataset.time
    this.setData({
      [`availableTimes.${time}`]: !this.data.availableTimes[time]
    })
  },

  // 提交注册
  submitRegister() {
    const data = this.data

    // 验证
    if (data.communityIndex < 0) {
      wx.showToast({ title: '请选择所在社区', icon: 'none' })
      return
    }
    if (!data.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (data.ageIndex < 0) {
      wx.showToast({ title: '请选择年龄', icon: 'none' })
      return
    }
    if (data.expertiseIndex[0] < 0) {
      wx.showToast({ title: '请选择专业领域', icon: 'none' })
      return
    }
    const hasTime = Object.values(data.availableTimes).some(v => v)
    if (!hasTime) {
      wx.showToast({ title: '请选择可服务时间', icon: 'none' })
      return
    }

    wx.showLoading({ title: '注册中...' })

    // 构建用户数据
    const userData = {
      role: 'expert',
      phone: data.phone,
      name: data.name.trim(),
      community: data.communities[data.communityIndex],
      age: data.ageIndex + 55,
      expertise: data.expertiseOptions[0][data.expertiseIndex[0]],
      availableTimes: data.availableTimes,
      nickName: data.name.trim(),
      avatarUrl: '',
      createTime: new Date(),
      status: 'active',
      profileCompleted: true
    }

    // 保存到数据库
    wx.cloud.database().collection('users').add({
      data: userData
    }).then(res => {
      wx.hideLoading()
      wx.showToast({ title: '注册成功', icon: 'success' })

      userData._id = res._id
      wx.setStorageSync('userInfo', userData)
      wx.setStorageSync('loginTime', Date.now())

      app.globalData.userInfo = userData
      app.globalData.isLoggedIn = true

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 500)
    }).catch(err => {
      wx.hideLoading()
      console.error('注册失败:', err)
      wx.showToast({ title: '注册失败，请重试', icon: 'none' })
    })
  }
})
