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
      category: '',
      ageRange: '',
      status: '',
      community: ''
    },
    // 筛选选项
    categories: [
      { id: '', name: '全部类型' },
      { id: 'culture', name: '文化传承' },
      { id: 'skill', name: '技能分享' },
      { id: 'story', name: '故事课堂' },
      { id: 'health', name: '健康养生' },
      { id: 'art', name: '艺术鉴赏' }
    ],
    ageRanges: [
      { id: '', name: '全部年龄' },
      { id: '3-6', name: '3-6岁' },
      { id: '6-12', name: '6-12岁' },
      { id: '12+', name: '12岁以上' },
      { id: 'all', name: '全年龄' }
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
    // 筛选面板显示
    showFilterPanel: false,
    activeFilter: '',
    // 收藏列表
    favorites: [],
    // 筛选标签
    filterLabels: {
      category: '课程类型',
      ageRange: '年龄',
      status: '状态',
      community: '社区'
    }
  },

  onLoad() {
    const userInfo = app.globalData.userInfo || {}
    const role = userInfo.role || 'parent'
    this.setData({
      role,
      roleName: this.getRoleName(role)
    })
    this.loadFavorites()
    this.loadCourses(true)
  },

  onShow() {
    if (this.data.list.length === 0) {
      this.loadCourses(true)
    }
  },

  getRoleName(role) {
    const names = { parent: '家长', expert: '银龄导师', volunteer: '青年志愿者' }
    return names[role] || '家长'
  },

  // 加载收藏列表
  async loadFavorites() {
    try {
      const userInfo = app.globalData.userInfo || {}
      if (!userInfo._id) return
      const res = await app.callCloudFunction('user', 'getFavorites', { type: 'course' })
      if (res.success && res.data) {
        this.setData({ favorites: res.data.list || [] })
      }
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  },

  // 加载课程列表
  async loadCourses(refresh = false) {
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

      // 添加筛选条件
      if (filters.category) params.category = filters.category
      if (filters.ageRange) params.ageRange = filters.ageRange
      if (filters.status) params.status = filters.status
      if (filters.community) params.community = filters.community

      const res = await app.callCloudFunction('course', 'list', params)

      if (res.success && res.data) {
        const list = res.data.list.map(item => this.formatCourse(item))
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
      console.error('加载课程失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  },

  // 格式化课程数据
  formatCourse(item) {
    const statusMap = {
      available: '报名中',
      full: '已满员',
      ended: '已结束',
      cancelled: '已取消'
    }
    return {
      ...item,
      statusText: statusMap[item.status] || '报名中',
      isFav: this.data.favorites.includes(item._id),
      remainingSpots: (item.maxParticipants || 20) - (item.currentParticipants || 0)
    }
  },

  // 切换筛选面板
  toggleFilter(e) {
    const type = e.currentTarget.dataset.type
    if (this.data.activeFilter === type) {
      this.setData({ showFilterPanel: false, activeFilter: '' })
    } else {
      this.setData({ showFilterPanel: true, activeFilter: type })
    }
  },

  // 选择筛选项
  onFilterSelect(e) {
    const { type, value } = e.currentTarget.dataset
    const optionsMap = {
      category: this.data.categories,
      ageRange: this.data.ageRanges,
      status: this.data.statusOptions,
      community: this.data.communityOptions
    }
    const defaultLabels = { category: '课程类型', ageRange: '年龄', status: '状态', community: '社区' }
    const options = optionsMap[type] || []
    const found = options.find(o => o.id === value)
    const label = found ? found.name : defaultLabels[type]
    this.setData({
      [`filters.${type}`]: value,
      [`filterLabels.${type}`]: label,
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadCourses(true)
  },

  // 重置筛选
  resetFilters() {
    this.setData({
      filters: { category: '', ageRange: '', status: '', community: '' },
      filterLabels: { category: '课程类型', ageRange: '年龄', status: '状态', community: '社区' },
      showFilterPanel: false,
      activeFilter: ''
    })
    this.loadCourses(true)
  },

  // 收藏/取消收藏
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
      const res = await app.callCloudFunction('user', action, { type: 'course', targetId: id })

      if (res.success) {
        const favorites = isFav
          ? this.data.favorites.filter(f => f !== id)
          : [...this.data.favorites, id]

        const list = this.data.list.map(item => ({
          ...item,
          isFav: item._id === id ? !isFav : item.isFav
        }))

        this.setData({ favorites, list })
        wx.showToast({ title: isFav ? '已取消收藏' : '已收藏', icon: 'none' })
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 跳转详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course/detail/detail?id=${id}` })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadCourses(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCourses()
    }
  }
})
