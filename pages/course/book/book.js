const app = getApp()

Page({
  data: {
    courseId: '',
    courseName: '',
    time: '',
    place: '',
    name: '',
    phone: '',
    remark: ''
  },
  onLoad(options) {
    const courseId = Number(options.courseId || 0)
    const list = app.globalData.courseList || []
    const course = list.find(c => c.id === courseId) || list[0] || {}
    this.setData({
      courseId,
      courseName: course.name || '',
      time: course.time || '',
      place: course.place || ''
    })
  },
  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  submit() {
    const { courseId, name, phone } = this.data
    if (!name) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return }
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    // 更新全局课程状态为「已预约」
    const list = app.globalData.courseList || []
    const idx = list.findIndex(c => c.id === courseId)
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status: '已预约',
        statusClass: 'status-booked',
        statusText: '已预约'
      }
      app.globalData.courseList = list
    }
    // 同步上一页列表数据
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.route === 'pages/course/list/list') {
      prevPage.setData({ list })
    }
    wx.showToast({ title: '预约成功' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
