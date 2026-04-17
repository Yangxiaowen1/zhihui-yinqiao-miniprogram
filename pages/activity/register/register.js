const app = getApp()

Page({
  data: {
    activityId: '',
    activityName: '社区植树节',
    time: '2026年3月12日 9:00',
    place: '社区公园',
    name: '',
    phone: '',
    roles: ['银龄（老年人）', '青年'],
    roleIndex: 0
  },
  onLoad(options) {
    const activityId = options.activityId || ''
    this.setData({ activityId })
    
    // 根据活动ID获取活动信息
    if (activityId) {
      const list = app.globalData.activityList || []
      const activity = list.find(a => a.id === Number(activityId))
      if (activity) {
        this.setData({
          activityName: activity.name,
          time: activity.time,
          place: activity.place
        })
      }
    }
  },
  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onRoleChange(e) { this.setData({ roleIndex: Number(e.detail.value) }) },
  submit() {
    const { activityId, name, phone } = this.data
    if (!name) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return }
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    // 更新活动状态为已报名
    const list = app.globalData.activityList || []
    const idx = list.findIndex(a => a.id === Number(activityId))
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status: 'registered'
      }
      app.globalData.activityList = list
    }
    // 同步上一页列表
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.route === 'pages/activity/list/list') {
      prevPage.setData({ list })
    }
    wx.showToast({ title: '报名成功，请去组队' })
    setTimeout(() => {
      wx.navigateTo({ url: `/pages/activity/team/team?activityId=${this.data.activityId}` })
    }, 1500)
  }
})
