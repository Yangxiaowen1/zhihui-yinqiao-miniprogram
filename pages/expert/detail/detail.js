const app = getApp()

Page({
  data: {
    id: '',
    detail: {},
    role: '',
    roleName: '',
    loading: true,
    isFav: false,
    timeSlots: [],
    selectedSlot: null,
    myBooking: null,
    // 评论列表
    comments: []
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
      const res = await app.callCloudFunction('expert', 'detail', { id: this.data.id })
      if (res.success && res.data) {
        const detail = res.data
        detail.avatarText = detail.name ? detail.name[0] : '师'
        detail.stars = detail.starLevel >= 3 ? '⭐⭐⭐' : detail.starLevel >= 2 ? '⭐⭐' : '⭐'
        this.setData({ detail, loading: false })

        // 加载可预约时段
        if (this.data.role === 'parent' && detail.status === 'available') {
          this.loadTimeSlots()
        }

        // 加载评论
        this.loadComments()
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '专家不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载专家详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async checkFavorite() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'expert' })
      if (res.success && res.data) {
        this.setData({ isFav: (res.data.list || []).includes(this.data.id) })
      }
    } catch (err) {
      console.error('检查收藏失败:', err)
    }
  },

  async loadTimeSlots() {
    try {
      const res = await app.callCloudFunction('expert', 'getSlots', { expertId: this.data.id })
      if (res.success && res.data) {
        this.setData({ timeSlots: res.data })
      }
    } catch (err) {
      console.error('加载时段失败:', err)
    }
  },

  async loadComments() {
    try {
      const res = await app.callCloudFunction('expert', 'getComments', { expertId: this.data.id, page: 1, pageSize: 10 })
      if (res.success && res.data) {
        this.setData({ comments: res.data.list || [] })
      }
    } catch (err) {
      console.error('加载评论失败:', err)
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
      const res = await app.callCloudFunction('user', action, { type: 'expert', targetId: this.data.id })
      if (res.success) {
        this.setData({ isFav: !this.data.isFav })
        wx.showToast({ title: this.data.isFav ? '已收藏' : '已取消收藏', icon: 'none' })
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
    }
  },

  selectSlot(e) {
    const id = e.currentTarget.dataset.id
    const slots = this.data.timeSlots.map(s => ({ ...s, selected: s.id === id }))
    const selected = slots.find(s => s.id === id)
    this.setData({ timeSlots: slots, selectedSlot: selected && selected.available ? selected : null })
  },

  // 家长：预约专家
  async bookExpert() {
    const selectedSlot = this.data.selectedSlot
    if (!selectedSlot) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' })
      return
    }

    const userInfo = app.globalData.userInfo || {}
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认预约',
      content: `确认预约「${this.data.detail.name}」专家？时间：${selectedSlot.displayTime}`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('expert', 'book', {
              expertId: this.data.id,
              slotId: selectedSlot.id,
              slotInfo: {
                date: selectedSlot.date,
                time: selectedSlot.time,
                displayTime: selectedSlot.displayTime
              },
              contactName: userInfo.nickName || userInfo.realName || '',
              contactPhone: userInfo.phone || ''
            })

            if (result.success) {
              wx.showToast({ title: '预约成功', icon: 'success' })
              this.setData({ selectedSlot: null, myBooking: { slotInfo: selectedSlot } })
              this.loadTimeSlots()
            } else {
              wx.showToast({ title: result.errMsg || '预约失败', icon: 'none' })
            }
          } catch (err) {
            console.error('预约失败:', err)
            wx.showToast({ title: '预约失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 专家：编辑个人信息
  goEditProfile() {
    wx.navigateTo({ url: '/pages/expert/edit/edit' })
  },

  // 查看咨询记录
  goRecords() {
    wx.navigateTo({ url: '/pages/expert/record/record' })
  },

  onShareAppMessage() {
    return {
      title: `银龄智库：${this.data.detail.name}`,
      path: `/pages/expert/detail/detail?id=${this.data.id}`
    }
  }
})
