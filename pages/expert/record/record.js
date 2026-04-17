const app = getApp()

Page({
  data: {
    list: []
  },
  onShow() {
    this.setData({ list: app.globalData.expertRecords || [] })
  }
})
