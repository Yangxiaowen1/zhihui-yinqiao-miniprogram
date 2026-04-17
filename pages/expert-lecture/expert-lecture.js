const app = getApp()

Page({
  data: {
    // 当前巡讲信息
    currentLecture: {
      expertName: '王健康',
      expertTitle: '三甲医院主任医师',
      expertField: '老年医学 · 健康管理',
      date: '2026年4月12日',
      time: '14:00-16:00',
      location: '社区活动中心二楼多功能厅',
      topic: '《春季养生与慢性病管理》',
      intro: '春季是慢性病高发季节，王教授将为大家讲解春季养生要点、常见慢性病的预防与管理方法，以及老年人日常保健知识。现场提供免费健康咨询服务。'
    },
    // 下期预告
    nextLecture: {
      expertName: '刘营养',
      expertTitle: '营养学专家',
      expertField: '膳食营养 · 食疗养生',
      date: '2026年4月26日',
      time: '14:00-16:00',
      topic: '《老年人营养膳食搭配》'
    }
  },

  onLoad() {
    // 页面加载时播放介绍语音
    app.speak('欢迎来到银龄智库专家巡讲活动，本期由王健康教授主讲春季养生与慢性病管理，欢迎报名参加')
  },

  // 报名参加当前巡讲
  joinLecture() {
    wx.showModal({
      title: '确认报名',
      content: `您确定要报名参加"${this.data.currentLecture.topic}"巡讲活动吗？\n\n时间：${this.data.currentLecture.date} ${this.data.currentLecture.time}\n地点：${this.data.currentLecture.location}`,
      confirmText: '确认报名',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          // 模拟报名成功
          wx.showToast({
            title: '报名成功',
            icon: 'success',
            duration: 2000
          })
          app.speak('报名成功！请记得按时参加巡讲活动，现场提供免费健康咨询服务')
          
          // 延迟后跳转到我的报名页面
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/my-registrations/my-registrations'
            })
          }, 2000)
        }
      }
    })
  },

  // 设置下期提醒
  setRemind() {
    wx.showModal({
      title: '设置提醒',
      content: `是否设置"${this.data.nextLecture.topic}"活动提醒？\n\n我们将在活动开始前1天通知您`,
      confirmText: '设置提醒',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '提醒设置成功',
            icon: 'success',
            duration: 2000
          })
          app.speak('提醒设置成功，我们将在活动开始前通知您')
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '银龄智库专家巡讲 - 春季养生与慢性病管理',
      path: '/pages/expert-lecture/expert-lecture',
      imageUrl: '' // 可以配置分享图片
    }
  }
})
