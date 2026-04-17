Page({
  data: {
    current: 0,
    courseList: [
      { id: 1, name: '传统剪纸入门', time: '2月20日 14:00', status: '已预约' }
    ],
    expertList: [
      { id: 1, expert: '李教授', slot: '2月20日 15:00', question: '房产继承遗嘱公证' }
    ],
    activityList: [
      { id: 1, name: '青银读书会', time: '2月25日 14:00' }
    ]
  },
  switchTab(e) {
    this.setData({ current: Number(e.currentTarget.dataset.idx) })
  }
})
