Page({
  data: {
    courseId: '',
    courseName: '传统剪纸入门',
    time: '2026年2月20日 14:00'
  },
  onLoad(options) {
    this.setData({
      courseId: options.courseId || '',
      courseName: options.courseName || '传统剪纸入门',
      time: options.time || '2026年2月20日 14:00'
    })
  },
  scanCode() {
    wx.scanCode({
      success: (res) => {
        wx.showToast({ title: '签到成功' })
        setTimeout(() => wx.navigateBack(), 1500)
      },
      fail: () => wx.showToast({ title: '扫码失败', icon: 'none' })
    })
  }
})
