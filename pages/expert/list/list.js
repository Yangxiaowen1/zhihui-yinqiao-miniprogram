const app = getApp()

Page({
  data: {
    role: '',
    roleName: '',
    list: [],
    loading: true,
    // 筛选条件
    filters: {
      field: '',
      starLevel: '',
      community: '',
      availability: ''
    },
    // 筛选选项
    fieldOptions: [
      { id: '', name: '全部专长' },
      { id: '法律咨询', name: '法律咨询' },
      { id: '健康医疗', name: '健康医疗' },
      { id: '心理辅导', name: '心理辅导' },
      { id: '文化教育', name: '文化教育' },
      { id: '手工技艺', name: '手工技艺' }
    ],
    starOptions: [
      { id: '', name: '全部等级' },
      { id: '3', name: '三星导师' },
      { id: '2', name: '二星导师' },
      { id: '1', name: '一星导师' }
    ],
    communityOptions: [
      { id: '', name: '全部社区' },
      { id: '阳光社区', name: '阳光社区' },
      { id: '翠湖社区', name: '翠湖社区' },
      { id: '银杏社区', name: '银杏社区' }
    ],
    availabilityOptions: [
      { id: '', name: '全部时间' },
      { id: 'available', name: '可预约' },
      { id: 'busy', name: '忙碌中' }
    ],
    showFilterPanel: false,
    activeFilter: '',
    favorites: [],
    // 筛选标签
    filterLabels: {
      field: '专长',
      starLevel: '等级',
      community: '社区',
      availability: '时间'
    }
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {}
    const role = userInfo.role || 'parent'
    this.setData({ role, roleName: this.getRoleName(role) })
    this.loadFavorites()
    this.loadExperts()
  },

  getRoleName(role) {
    const names = { parent: '家长', expert: '银龄导师', volunteer: '青年志愿者' }
    return names[role] || '家长'
  },

  async loadFavorites() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'expert' })
      if (res.success && res.data) {
        this.setData({ favorites: res.data.list || [] })
      }
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  },

  async loadExperts() {
    try {
      this.setData({ loading: true })
      const userInfo = app.globalData.userInfo || {}
      const { filters, role } = this.data

      const params = {
        role,
        userId: userInfo._id,
        page: 1,
        pageSize: 20
      }

      if (filters.field) params.field = filters.field
      if (filters.starLevel) params.starLevel = parseInt(filters.starLevel)
      if (filters.community) params.community = filters.community
      if (filters.availability) params.availability = filters.availability

      const res = await app.callCloudFunction('expert', 'list', params)

      if (res.success && res.data && res.data.list) {
        this.setData({
          list: res.data.list.map(item => this.formatExpert(item)),
          loading: false
        })
      } else {
        this.setData({ list: [], loading: false })
      }
    } catch (err) {
      console.error('加载专家列表失败:', err)
      this.setData({ list: [], loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  formatExpert(item) {
    const statusMap = { available: '可预约', busy: '忙碌中', offline: '离线' }
    return {
      ...item,
      statusText: statusMap[item.status] || '可预约',
      avatarText: item.name ? item.name[0] : '师',
      stars: item.starLevel >= 3 ? '⭐⭐⭐' : item.starLevel >= 2 ? '⭐⭐' : '⭐',
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
      field: this.data.fieldOptions,
      starLevel: this.data.starOptions,
      community: this.data.communityOptions,
      availability: this.data.availabilityOptions
    }
    const defaultLabels = { field: '专长', starLevel: '等级', community: '社区', availability: '时间' }
    const options = optionsMap[type] || []
    const found = options.find(o => o.id === value)
    const label = found ? found.name : defaultLabels[type]
    this.setData({
      [`filters.${type}`]: value,
      [`filterLabels.${type}`]: label,
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadExperts()
  },

  resetFilters() {
    this.setData({
      filters: { field: '', starLevel: '', community: '', availability: '' },
      filterLabels: { field: '专长', starLevel: '等级', community: '社区', availability: '时间' },
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadExperts()
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
      const res = await app.callCloudFunction('user', action, { type: 'expert', targetId: id })

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
    wx.navigateTo({ url: `/pages/expert/detail/detail?id=${id}` })
  },

  onPullDownRefresh() {
    this.loadExperts().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})
