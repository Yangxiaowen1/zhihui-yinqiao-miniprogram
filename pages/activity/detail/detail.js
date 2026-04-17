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
    // 活动回顾
    recap: null
  },

  onLoad(options) {
    const userInfo = app.globalData.userInfo || {}
    this.setData({
      id: options.id,
      role: userInfo.role || 'parent',
      roleName: this.getRoleName(userInfo.role || 'parent')
    })
    this.loadDetail()
    this.checkFavorite()
  },

  getRoleName(role) {
    const names = { parent: '家长', expert: '银龄导师', volunteer: '青年志愿者' }
    return names[role] || '家长'
  },

  async loadDetail() {
    try {
      const res = await app.callCloudFunction('activity', 'detail', { id: this.data.id })
      if (res.success && res.data) {
        const detail = res.data
        detail.remainingSpots = (detail.maxParticipants || 20) - (detail.currentParticipants || 0)
        this.setData({ detail, loading: false })

        // 检查我的报名状态
        this.checkMyRegistration()

        // 已结束活动加载回顾
        if (detail.status === 'ended') {
          this.loadRecap()
        }
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '活动不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载活动详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async checkFavorite() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'activity' })
      if (res.success && res.data) {
        this.setData({ isFav: (res.data.list || []).includes(this.data.id) })
      }
    } catch (err) {
      console.error('检查收藏失败:', err)
    }
  },

  async checkMyRegistration() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('activity', 'checkRegistration', { activityId: this.data.id })
      if (res.success && res.data) {
        this.setData({ myRegistration: res.data })
      }
    } catch (err) {
      console.error('检查报名状态失败:', err)
    }
  },

  async loadRecap() {
    try {
      const res = await app.callCloudFunction('activity', 'getRecap', { activityId: this.data.id })
      if (res.success && res.data) {
        this.setData({ recap: res.data })
      }
    } catch (err) {
      console.error('加载回顾失败:', err)
    }
  },

  async toggleFav() {
    const userInfo = app.globalData.userInfo || {}
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    try {
      const action = this.data.isFav ? 'removeFavorite' : 'addFavorite'
      const res = await app.callCloudFunction('user', action, { type: 'activity', targetId: this.data.id })
      if (res.success) {
        this.setData({ isFav: !this.data.isFav })
        wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消收藏', icon: 'none' })
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
    }
  },

  // 报名活动
  async registerActivity() {
    const detail = this.data.detail
    if (detail.status === 'full') {
      wx.showToast({ title: '活动已满员', icon: 'none' })
      return
    }
    if (detail.status === 'ended') {
      wx.showToast({ title: '活动已结束', icon: 'none' })
      return
    }

    const roleLabel = this.data.role === 'volunteer' ? '志愿者' : this.data.role === 'expert' ? '导师' : '家长'

    wx.showModal({
      title: '确认报名',
      content: `确认以${roleLabel}身份报名「${detail.name}」？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const userInfo = app.globalData.userInfo || {}
            const identityMap = { volunteer: 'youth', expert: 'elderly', parent: 'parent' }
            const result = await app.callCloudFunction('activity', 'register', {
              activityId: this.data.id,
              identity: identityMap[this.data.role] || 'parent',
              name: userInfo.nickName || userInfo.realName || '',
              phone: userInfo.phone || ''
            })

            if (result.success) {
              wx.showToast({ title: '报名成功', icon: 'success' })
              this.loadDetail()
            } else {
              wx.showToast({ title: result.errMsg || '报名失败', icon: 'none' })
            }
          } catch (err) {
            console.error('报名失败:', err)
            wx.showToast({ title: '报名失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 取消报名
  async cancelRegistration() {
    wx.showModal({
      title: '取消报名',
      content: '确认取消报名？取消将扣除2信用分',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('activity', 'cancel', {
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

  // 签到二维码
  showCheckinQR() {
    wx.showToast({ title: '请在现场扫码签到', icon: 'none' })
  },

  // 去组队
  goTeam() {
    wx.navigateTo({ url: `/pages/activity/team/team?activityId=${this.data.id}` })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `青银共创：${this.data.detail.name}`,
      path: `/pages/activity/detail/detail?id=${this.data.id}`
    }
  }
})
