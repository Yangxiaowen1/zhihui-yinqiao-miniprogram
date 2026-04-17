Page({
  data: {
    courseId: '',
    courseName: '传统剪纸入门',
    score: 0,
    content: ''
  },
  onLoad(options) {
    this.setData({
      courseId: options.courseId || '',
      courseName: options.courseName || '传统剪纸入门'
    })
  },
  setScore(e) {
    this.setData({ score: e.currentTarget.dataset.index })
  },
  onContentInput(e) { this.setData({ content: e.detail.value }) },
  submit() {
    if (this.data.score === 0) {
      wx.showToast({ title: '请选择星级', icon: 'none' })
      return
    }
    wx.showToast({ title: '评价成功' })
    setTimeout(() => wx.navigateBack(), 1500)
  }
})
