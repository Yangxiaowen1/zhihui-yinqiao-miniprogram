const app = getApp()

Component({
  properties: {
    current: { type: Number, value: 0 }
  },
  data: {
    selected: 0,
    silverMode: false,
    // 普通模式下的Tab列表
    normalList: [
      { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
      { pagePath: '/pages/aggregate/aggregate', text: '聚合', icon: '▦' },
      { pagePath: '/pages/credit/credit', text: '信用', icon: '🎀' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
    ],
    // 银龄模式下的精简Tab列表
    silverList: [
      { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
      { pagePath: '/pages/my-registrations/my-registrations', text: '报名', icon: '📋' },
      { pagePath: '/pages/notifications/notifications', text: '消息', icon: '🔔' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
    ],
    list: []
  },
  
  lifetimes: {
    attached() {
      // 初始化银龄模式状态
      const isSilverMode = app.globalData.silverMode
      this.setData({
        silverMode: isSilverMode,
        list: isSilverMode ? this.data.silverList : this.data.normalList
      })
      
      // 注册银龄模式变更回调
      app.onSilverModeChange(this.onSilverModeChanged.bind(this))
    },
    
    detached() {
      app.offSilverModeChange(this.onSilverModeChanged.bind(this))
    }
  },
  
  observers: {
    'current': function (v) { this.setData({ selected: v }) }
  },
  
  methods: {
    // 银龄模式变更回调
    onSilverModeChanged(enabled) {
      this.setData({
        silverMode: enabled,
        list: enabled ? this.data.silverList : this.data.normalList
      })
    },
    
    switchTab(e) {
      const idx = e.currentTarget.dataset.index
      const path = this.data.list[idx].pagePath
      wx.switchTab({ url: path })
      this.setData({ selected: idx })
    }
  }
})
