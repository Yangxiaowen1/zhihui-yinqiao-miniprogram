const app = getApp()

Page({
  data: {
    role: '',
    roleName: '',
    list: [],
    loading: true,
    hasMore: true,
    page: 1,
    pageSize: 10,
    // 筛选条件
    filters: {
      activityType: '',
      status: '',
      community: ''
    },
    // 筛选选项
    typeOptions: [
      { id: '', name: '全部类型' },
      { id: 'volunteer', name: '志愿服务' },
      { id: 'family', name: '亲子活动' },
      { id: 'training', name: '技能培训' },
      { id: 'guide', name: '指导活动' },
      { id: 'community', name: '社区活动' }
    ],
    statusOptions: [
      { id: '', name: '全部状态' },
      { id: 'available', name: '报名中' },
      { id: 'full', name: '已满员' },
      { id: 'ended', name: '已结束' }
    ],
    communityOptions: [
      { id: '', name: '全部社区' },
      { id: '阳光社区', name: '阳光社区' },
      { id: '翠湖社区', name: '翠湖社区' },
      { id: '银杏社区', name: '银杏社区' }
    ],
    showFilterPanel: false,
    activeFilter: '',
    favorites: [],
    // 筛选标签
    filterLabels: {
      activityType: '活动类型',
      status: '状态',
      community: '社区'
    }
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {}
    const role = userInfo.role || 'parent'
    this.setData({ role, roleName: this.getRoleName(role) })
    this.loadFavorites()
    this.loadActivities(true)
  },

  onShow() {
    if (this.data.list.length === 0) {
      this.loadActivities(true)
    }
  },

  getRoleName(role) {
    const names = { parent: '家长', expert: '银龄导师', volunteer: '青年志愿者' }
    return names[role] || '家长'
  },

  async loadFavorites() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'activity' })
      if (res.success && res.data) {
        this.setData({ favorites: res.data.list || [] })
      }
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  },

  async loadActivities(refresh = false) {
    if (this.data.loading && !refresh) return

    this.setData({ loading: true })

    try {
      const userInfo = app.globalData.userInfo || {}
      const page = refresh ? 1 : this.data.page
      const { filters, role } = this.data

      const params = {
        role,
        userId: userInfo._id,
        page,
        pageSize: this.data.pageSize
      }

      if (filters.activityType) params.activityType = filters.activityType
      if (filters.status) params.status = filters.status
      if (filters.community) params.community = filters.community

      const res = await app.callCloudFunction('activity', 'list', params)

      if (res.success && res.data) {
        const list = res.data.list.map(item => this.formatActivity(item))
        this.setData({
          list: refresh ? list : [...this.data.list, ...list],
          page: page + 1,
          hasMore: res.data.hasMore || false,
          loading: false
        })
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载活动失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  formatActivity(item) {
    const typeMap = {
      volunteer: '志愿服务', family: '亲子活动', training: '技能培训',
      guide: '指导活动', community: '社区活动'
    }
    const statusMap = {
      available: '报名中', full: '已满员', ended: '已结束', cancelled: '已取消'
    }
    return {
      ...item,
      activityTypeText: typeMap[item.activityType] || '社区活动',
      statusText: statusMap[item.status] || '报名中',
      remainingSpots: (item.maxParticipants || 20) - (item.currentParticipants || 0),
      isFav: this.data.favorites.includes(item._id)
    }
  },

  toggleFilter(e) {
    const type = e.currentTarget.dataset.type
    if (this.data.activeFilter === type) {
      this.setData({ showFilterPanel: false, activeFilter: '' })
    } else {
      this.setData({ showFilterPanel: true, activeFilter: type })
    }
  },

  onFilterSelect(e) {
    const { type, value } = e.currentTarget.dataset
    const optionsMap = {
      activityType: this.data.typeOptions,
      status: this.data.statusOptions,
      community: this.data.communityOptions
    }
    const defaultLabels = { activityType: '活动类型', status: '状态', community: '社区' }
    const options = optionsMap[type] || []
    const found = options.find(o => o.id === value)
    const label = found ? found.name : defaultLabels[type]
    this.setData({
      [`filters.${type}`]: value,
      [`filterLabels.${type}`]: label,
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadActivities(true)
  },

  resetFilters() {
    this.setData({
      filters: { activityType: '', status: '', community: '' },
      filterLabels: { activityType: '活动类型', status: '状态', community: '社区' },
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadActivities(true)
  },

  async toggleFav(e) {
    const id = e.currentTarget.dataset.id
    const userInfo = app.globalData.userInfo || {}
    if (!userInfo._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      const isFav = this.data.favorites.includes(id)
      const action = isFav ? 'removeFavorite' : 'addFavorite'
      const res = await app.callCloudFunction('user', action, { type: 'activity', targetId: id })

      if (res.success) {
        const favorites = isFav ? this.data.favorites.filter(f => f !== id) : [...this.data.favorites, id]
        const list = this.data.list.map(item => ({
          ...item,
          isFav: item._id === id ? !isFav : item.isFav
        }))
        this.setData({ favorites, list })
        wx.showToast({ title: isFav ? '已取消收藏' : '已收藏', icon: 'none' })
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/activity/detail/detail?id=${id}` })
  },

  onPullDownRefresh() {
    this.loadActivities(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadActivities()
    }
  }
})
