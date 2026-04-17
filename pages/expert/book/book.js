const app = getApp()

Page({
  data: {
    expertId: '',
    expertName: '李教授',
    slot: '2月20日 15:00',
    name: '',
    phone: '',
    question: ''
  },
  onLoad(options) {
    this.setData({
      expertId: options.expertId || '',
      slot: options.slot ? decodeURIComponent(options.slot) : '2月20日 15:00'
    })
  },
  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onQuestionInput(e) { this.setData({ question: e.detail.value }) },
  submit() {
    const { expertId, name, phone, question, slot } = this.data
    if (!name) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return }
    if (!phone) { wx.showToast({ title: '请输入手机号', icon: 'none' }); return }
    if (!question) { wx.showToast({ title: '请描述咨询问题', icon: 'none' }); return }
    // 更新专家列表状态为已预约
    const experts = app.globalData.expertList || []
    const idx = experts.findIndex(e => e.id === Number(expertId))
    if (idx !== -1) {
      experts[idx] = {
        ...experts[idx],
        status: '已预约',
        statusClass: 'status-booked',
        mySlot: slot
      }
      app.globalData.expertList = experts
    }
    // 追加一条咨询记录
    const records = app.globalData.expertRecords || []
    records.unshift({
      id: Date.now(),
      expert: this.data.expertName || '专家',
      time: slot,
      question,
      result: '咨询已预约，待专家为您解答后将更新结果。'
    })
    app.globalData.expertRecords = records

    wx.showToast({ title: '预约成功，咨询结果将记录在「咨询记录」' })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/expert/record/record' })
    }, 1500)
  }
})
