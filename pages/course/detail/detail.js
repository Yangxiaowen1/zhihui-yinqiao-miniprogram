const app = getApp()

Page({
  data: {
    id: '',
    detail: {},
    role: '',
    roleName: '',
    loading: true,
    isFav: false,
    myRegistration: null,
    // 专家角色：报名列表
    enrollmentList: [],
    // 志愿者角色：是否已报名助教
    isAssistant: false
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || {}
    const role = userInfo.role || 'parent'
    this.setData({
      id: options.id,
      role,
      roleName: this.getRoleName(role)
    })
    this.loadDetail()
    this.checkFavorite()
  },

  getRoleName(role) {
    const names = { parent: '家长', expert: '银龄导师', volunteer: '青年志愿者' }
    return names[role] || '家长'
  },

  // 加载课程详情
  async loadDetail() {
    try {
      const res = await app.callCloudFunction('course', 'detail', { id: this.data.id })
      if (res.success && res.data) {
        const detail = res.data
        detail.statusText = this.getStatusText(detail.status)
        detail.remainingSpots = (detail.maxParticipants || 20) - (detail.currentParticipants || 0)
        this.setData({ detail, loading: false })

        // 根据角色加载额外信息
        if (this.data.role === 'parent') {
          this.checkMyRegistration()
        } else if (this.data.role === 'expert') {
          this.loadEnrollmentList()
        } else if (this.data.role === 'volunteer') {
          this.checkAssistantStatus()
        }
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '课程不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载课程详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  getStatusText(status) {
    const map = { available: '报名中', full: '已满员', ended: '已结束', cancelled: '已取消' }
    return map[status] || status
  },

  // 检查是否已收藏
  async checkFavorite() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'course' })
      if (res.success && res.data) {
        this.setData({ isFav: (res.data.list || []).includes(this.data.id) })
      }
    } catch (err) {
      console.error('检查收藏失败:', err)
    }
  },

  // 家长：检查是否已报名
  async checkMyRegistration() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('course', 'checkRegistration', { courseId: this.data.id })
      if (res.success && res.data) {
        this.setData({ myRegistration: res.data })
      }
    } catch (err) {
      console.error('检查报名状态失败:', err)
    }
  },

  // 专家：加载报名列表
  async loadEnrollmentList() {
    try {
      const res = await app.callCloudFunction('course', 'getEnrollmentList', { courseId: this.data.id })
      if (res.success && res.data) {
        this.setData({ enrollmentList: res.data.list || [] })
      }
    } catch (err) {
      console.error('加载报名列表失败:', err)
    }
  },

  // 志愿者：检查助教状态
  async checkAssistantStatus() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('course', 'checkAssistantStatus', { courseId: this.data.id })
      if (res.success && res.data) {
        this.setData({ isAssistant: res.data.isAssistant || false })
      }
    } catch (err) {
      console.error('检查助教状态失败:', err)
    }
  },

  // 收藏/取消收藏
  async toggleFav() {
    const userInfo = app.globalData.userInfo || {}
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      const action = this.data.isFav ? 'removeFavorite' : 'addFavorite'
      const res = await app.callCloudFunction('user', action, { type: 'course', targetId: this.data.id })
      if (res.success) {
        this.setData({ isFav: !this.data.isFav })
        wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消收藏', icon: 'none' })
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
    }
  },

  // 家长：报名课程
  async registerCourse() {
    const detail = this.data.detail
    if (detail.status === 'full') {
      wx.showToast({ title: '课程已满员', icon: 'none' })
      return
    }
    if (detail.status === 'ended') {
      wx.showToast({ title: '课程已结束', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认报名',
      content: `确认报名「${detail.name}」课程？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const userInfo = app.globalData.userInfo || {}
            const result = await app.callCloudFunction('course', 'register', {
              courseId: this.data.id,
              name: userInfo.nickName || userInfo.realName || '',
              phone: userInfo.phone || ''
            })

            if (result.success) {
              wx.showToast({ title: '报名成功', icon: 'success' })
              this.loadDetail()
              this.checkMyRegistration()
            } else {
              wx.showToast({ title: result.errMsg || '报名失败', icon: 'none' })
            }
          } catch (err) {
            console.error('报名失败:', err)
            wx.showToast({ title: '报名失败，请重试', icon: 'none' })
          }
        }
      }
    })
  },

  // 家长：取消报名
  async cancelRegistration() {
    wx.showModal({
      title: '取消报名',
      content: '确认取消报名？取消将扣除1信用分',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('course', 'cancel', {
              registrationId: this.data.myRegistration._id
            })
            if (result.success) {
              wx.showToast({ title: '已取消报名', icon: 'none' })
              this.setData({ myRegistration: null })
              this.loadDetail()
            } else {
              wx.showToast({ title: result.errMsg || '取消失败', icon: 'none' })
            }
          } catch (err) {
            console.error('取消报名失败:', err)
          }
        }
      }
    })
  },

  // 志愿者：报名助教
  async signupAssistant() {
    wx.showModal({
      title: '报名助教',
      content: `确认申请「${this.data.detail.name}」课程助教？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('course', 'signupAssistant', {
              courseId: this.data.id
            })
            if (result.success) {
              wx.showToast({ title: '报名成功', icon: 'success' })
              this.setData({ isAssistant: true })
            } else {
              wx.showToast({ title: result.errMsg || '报名失败', icon: 'none' })
            }
          } catch (err) {
            console.error('助教报名失败:', err)
          }
        }
      }
    })
  },

  // 专家：关闭课程
  async closeCourse() {
    wx.showModal({
      title: '关闭课程',
      content: '确认关闭此课程？关闭后不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('course', 'updateStatus', {
              courseId: this.data.id,
              status: 'ended'
            })
            if (result.success) {
              wx.showToast({ title: '课程已关闭', icon: 'none' })
              this.loadDetail()
            }
          } catch (err) {
            console.error('关闭课程失败:', err)
          }
        }
      }
    })
  },

  // 专家：编辑课程
  goEdit() {
    wx.navigateTo({ url: `/pages/course/edit/edit?id=${this.data.id}` })
  },

  // 去评价
  goEvaluate() {
    wx.navigateTo({ url: `/pages/course/evaluate/evaluate?courseId=${this.data.id}&registrationId=${this.data.myRegistration._id}` })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `智享学堂：${this.data.detail.name}`,
      path: `/pages/course/detail/detail?id=${this.data.id}`
    }
  }
})
