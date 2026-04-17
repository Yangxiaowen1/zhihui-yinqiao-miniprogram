Page({
  data: {
    keyword: '',
    type: 'course',
    result: []
  },
  onInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })
    this.search(keyword)
  },
  setType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
    this.search(this.data.keyword)
  },
  search(keyword) {
    if (!keyword) {
      this.setData({ result: [] })
      return
    }
    const type = this.data.type
    let result = []
    if (type === 'course') {
      result = [
        { type: 'course', id: 1, name: '传统剪纸入门', sub: '2月20日 14:00 · 社区活动室' }
      ].filter(i => i.name.indexOf(keyword) >= 0)
    } else if (type === 'expert') {
      result = [
        { type: 'expert', id: 1, name: '李教授', sub: '法律顾问 · 可预约 2月18日' }
      ].filter(i => i.name.indexOf(keyword) >= 0)
    } else {
      result = [
        { type: 'activity', id: 1, name: '社区植树节', sub: '3月12日 9:00 · 社区公园' }
      ].filter(i => i.name.indexOf(keyword) >= 0)
    }
    this.setData({ result })
  },
  goDetail(e) {
    const item = e.currentTarget.dataset.item
    if (item.type === 'course') wx.navigateTo({ url: `/pages/course/detail/detail?id=${item.id}` })
    else if (item.type === 'expert') wx.navigateTo({ url: `/pages/expert/detail/detail?id=${item.id}` })
    else wx.navigateTo({ url: `/pages/activity/detail/detail?id=${item.id}` })
  },
  cancel() {
    wx.navigateBack()
  }
})
