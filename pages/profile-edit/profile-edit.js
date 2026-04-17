// 编辑资料页面
const app = getApp()

Page({
  data: {
    userInfo: {},
    communities: ['阳光社区', '幸福社区', '和谐社区', '文明社区', '康乐社区', '安宁社区', '繁荣社区', '花园社区'],
    communityIndex: 0,
    ageRange: [],
    childAgeIndex: 0,
    expertAgeRange: [],
    expertAgeIndex: 0,
    expertiseOptions: ['教育辅导', '心理咨询', '健康养生', '法律咨询', '文化艺术', '手工制作', '体育健身', '其他'],
    expertiseIndex: 0,
    availableTimes: {
      morning: false,
      afternoon: false,
      evening: false,
      weekend: false
    }
  },

  onLoad() {
    this.initData()
    this.loadUserInfo()
  },

  initData() {
    // 孩子年龄范围 3-12岁
    const ageRange = []
    for (let i = 3; i <= 12; i++) {
      ageRange.push(i + '岁')
    }
    
    // 导师年龄范围 55-80岁
    const expertAgeRange = []
    for (let i = 55; i <= 80; i++) {
      expertAgeRange.push(i + '岁')
    }

    this.setData({ ageRange, expertAgeRange })
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    const communityIndex = this.data.communities.indexOf(userInfo.community)
    let childAgeIndex = 0
    let expertAgeIndex = 0
    let expertiseIndex = 0

    if (userInfo.role === 'parent' && userInfo.child && userInfo.child.age) {
      childAgeIndex = userInfo.child.age - 3
    }
    if (userInfo.role === 'expert') {
      if (userInfo.age) {
        expertAgeIndex = userInfo.age - 55
      }
      expertiseIndex = this.data.expertiseOptions.indexOf(userInfo.expertise)
    }

    this.setData({
      userInfo: { ...userInfo },
      communityIndex: communityIndex >= 0 ? communityIndex : 0,
      childAgeIndex: childAgeIndex >= 0 ? childAgeIndex : 0,
      expertAgeIndex: expertAgeIndex >= 0 ? expertAgeIndex : 0,
      expertiseIndex: expertiseIndex >= 0 ? expertiseIndex : 0,
      availableTimes: userInfo.availableTimes || this.data.availableTimes
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ 'userInfo.avatarUrl': tempFilePath })
      }
    })
  },

  // 输入处理
  onNickNameInput(e) {
    this.setData({ 'userInfo.nickName': e.detail.value })
  },

  onGuardianNameInput(e) {
    this.setData({ 'userInfo.guardianName': e.detail.value })
  },

  onNameInput(e) {
    this.setData({ 'userInfo.name': e.detail.value })
  },

  onChildNameInput(e) {
    this.setData({ 'userInfo.child.name': e.detail.value })
  },

  onSchoolInput(e) {
    this.setData({ 'userInfo.school': e.detail.value })
  },

  // 选择器处理
  onCommunityChange(e) {
    const index = e.detail.value
    this.setData({
      communityIndex: index,
      'userInfo.community': this.data.communities[index]
    })
  },

  onAgeChange(e) {
    const index = e.detail.value
    this.setData({
      childAgeIndex: index,
      'userInfo.child.age': index + 3
    })
  },

  onExpertAgeChange(e) {
    const index = e.detail.value
    this.setData({
      expertAgeIndex: index,
      'userInfo.age': index + 55
    })
  },

  onExpertiseChange(e) {
    const index = e.detail.value
    this.setData({
      expertiseIndex: index,
      'userInfo.expertise': this.data.expertiseOptions[index]
    })
  },

  selectChildGender(e) {
    this.setData({ 'userInfo.child.gender': e.currentTarget.dataset.gender })
  },

  toggleTime(e) {
    const time = e.currentTarget.dataset.time
    this.setData({
      [`availableTimes.${time}`]: !this.data.availableTimes[time]
    })
  },

  // 保存资料
  saveProfile() {
    const data = this.data
    let userInfo = { ...data.userInfo }

    // 根据角色更新对应字段
    if (userInfo.role === 'expert' || userInfo.role === 'volunteer') {
      userInfo.availableTimes = data.availableTimes
    }

    wx.showLoading({ title: '保存中...' })

    // 更新数据库
    wx.cloud.database().collection('users').doc(userInfo._id).update({
      data: userInfo
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 更新本地存储
      wx.setStorageSync('userInfo', userInfo)
      app.globalData.userInfo = userInfo

      setTimeout(() => {
        wx.navigateBack()
      }, 500)
    }).catch(err => {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
