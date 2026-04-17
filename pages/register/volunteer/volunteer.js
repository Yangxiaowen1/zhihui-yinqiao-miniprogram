// 智汇银桥 - 青年志愿者注册表单（简化版）
const app = getApp()

Page({
  data: {
    phone: '',
    communityIndex: -1,
    communities: ['阳光社区', '幸福社区', '和谐社区', '文明社区', '康乐社区', '安宁社区', '繁荣社区', '花园社区'],
    name: '',
    school: '',
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
  },

  onCommunityChange(e) {
    this.setData({ communityIndex: e.detail.value })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onSchoolInput(e) {
    this.setData({ school: e.detail.value })
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
    if (!data.school.trim()) {
      wx.showToast({ title: '请输入所在院校', icon: 'none' })
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
      role: 'volunteer',
      phone: data.phone,
      name: data.name.trim(),
      community: data.communities[data.communityIndex],
      school: data.school.trim(),
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
