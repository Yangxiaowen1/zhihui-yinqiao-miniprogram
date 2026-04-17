const app = getApp()

Page({
  data: {
    activityId: '',
    activityName: '社区植树节',
    time: '2026年3月12日 9:00',
    place: '社区公园',
    myRole: '银龄（老年人）',
    teammate: {}  // 有队友时 { name, role }
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
  match() {
    wx.showLoading({ title: '匹配中...' })
    setTimeout(() => {
      wx.hideLoading()
      this.setData({
        teammate: { name: '小张', role: '青年' }
      })
      wx.showToast({ title: '匹配成功' })
    }, 800)
  },
  onShareAppMessage() {
    return {
      title: `邀请你一起参加「${this.data.activityName}」组队`,
      path: `/pages/activity/team/team?activityId=${this.data.activityId}`
    }
  }
})
