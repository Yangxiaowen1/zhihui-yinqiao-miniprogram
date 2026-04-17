// 智汇银桥 - 家长注册表单（简化版）
const app = getApp()

Page({
  data: {
    phone: '',
    communityIndex: -1,
    communities: ['阳光社区', '幸福社区', '和谐社区', '文明社区', '康乐社区', '安宁社区', '繁荣社区', '花园社区'],
    guardianName: '',
    childName: '',
    childAgeIndex: -1,
    ageRange: ['3岁', '4岁', '5岁', '6岁', '7岁', '8岁', '9岁', '10岁', '11岁', '12岁'],
    childGender: ''
  },

  onLoad(options) {
    if (options.phone) {
      this.setData({ phone: options.phone })
    }
  },

  onCommunityChange(e) {
    this.setData({ communityIndex: e.detail.value })
  },

  onGuardianNameInput(e) {
    this.setData({ guardianName: e.detail.value })
  },

  onChildNameInput(e) {
    this.setData({ childName: e.detail.value })
  },

  onAgeChange(e) {
    this.setData({ childAgeIndex: e.detail.value })
  },

  selectChildGender(e) {
    this.setData({ childGender: e.currentTarget.dataset.gender })
  },

  // 提交注册
  submitRegister() {
    const data = this.data

    // 验证
    if (data.communityIndex < 0) {
      wx.showToast({ title: '请选择所在社区', icon: 'none' })
      return
    }
    if (!data.guardianName.trim()) {
      wx.showToast({ title: '请输入家长姓名', icon: 'none' })
      return
    }
    if (!data.childName.trim()) {
      wx.showToast({ title: '请输入孩子姓名', icon: 'none' })
      return
    }
    if (data.childAgeIndex < 0) {
      wx.showToast({ title: '请选择孩子年龄', icon: 'none' })
      return
    }
    if (!data.childGender) {
      wx.showToast({ title: '请选择孩子性别', icon: 'none' })
      return
    }

    wx.showLoading({ title: '注册中...' })

    // 构建用户数据
    const userData = {
      role: 'parent',
      phone: data.phone,
      guardianName: data.guardianName.trim(),
      community: data.communities[data.communityIndex],
      child: {
        name: data.childName.trim(),
        age: data.childAgeIndex + 3,
        gender: data.childGender
      },
      nickName: data.guardianName.trim(),
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
