Page({
  data: {
    role: '',
    roleName: '',
    loading: true,
    courseList: [],
    expertList: [],
    activityList: [],
    // 角色相关描述
    courseDesc: '发现精彩课程，开启学习之旅',
    expertDesc: '银龄导师，智慧传承',
    activityDesc: '志愿服务，共筑美好社区'
  },

  onLoad() {
    this.loadAllData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  async loadAllData() {
    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || {}
      const role = userInfo.role || 'parent'

      // 根据角色调整描述
      const descMap = {
        parent: {
          course: '发现精彩课程，开启学习之旅',
          expert: '银龄导师，智慧传承',
          activity: '亲子活动，共筑美好社区'
        },
        expert: {
          course: '管理我的课程，查看报名情况',
          expert: '我的导师资料',
          activity: '报名指导活动，传授经验'
        },
        volunteer: {
          course: '助教课程，服务社区',
          expert: '银龄导师，智慧传承',
          activity: '志愿活动，奉献青春'
        }
      }

      const descs = descMap[role] || descMap.parent

      this.setData({
        role,
        roleName: this.getRoleName(role),
        courseDesc: descs.course,
        expertDesc: descs.expert,
        activityDesc: descs.activity,
        loading: true
      })

      const timeout = 8000
      const loadWithTimeout = async (fn) => {
        return Promise.race([
          fn(),
          new Promise(resolve => setTimeout(() => resolve([]), timeout))
        ])
      }

      const [courseRes, expertRes, activityRes] = await Promise.all([
        loadWithTimeout(() => this.loadCourseList(role, userInfo._id)),
        loadWithTimeout(() => this.loadExpertList(role, userInfo._id)),
        loadWithTimeout(() => this.loadActivityList(role, userInfo._id))
      ])

      this.setData({
        courseList: courseRes,
        expertList: expertRes,
        activityList: activityRes,
        loading: false
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      this.setData({
        courseList: [],
        expertList: [],
        activityList: [],
        loading: false
      })
      wx.showToast({ title: '数据加载失败，请下拉刷新', icon: 'none' })
    }
  },

  getRoleName(role) {
    const names = {
      parent: '家长',
      expert: '银龄导师',
      volunteer: '青年志愿者'
    }
    return names[role] || '家长'
  },

  async loadCourseList(role, userId) {
    try {
      const app = getApp()
      const res = await app.callCloudFunction('course', 'getPreview', { role, userId, limit: 3 })
      if (res.success && res.data && res.data.list) {
        return res.data.list.map(item => this.formatCourse(item))
      }
      return []
    } catch (err) {
      console.error('加载课程失败:', err)
      return []
    }
  },

  async loadExpertList(role, userId) {
    try {
      const app = getApp()
      const res = await app.callCloudFunction('expert', 'getPreview', { role, userId, limit: 3 })
      if (res.success && res.data && res.data.list) {
        return res.data.list.map(item => this.formatExpert(item))
      }
      return []
    } catch (err) {
      console.error('加载专家失败:', err)
      return []
    }
  },

  async loadActivityList(role, userId) {
    try {
      const app = getApp()
      const res = await app.callCloudFunction('activity', 'getPreview', { role, userId, limit: 3 })
      if (res.success && res.data && res.data.list) {
        return res.data.list.map(item => this.formatActivity(item))
      }
      return []
    } catch (err) {
      console.error('加载活动失败:', err)
      return []
    }
  },

  formatCourse(item) {
    const statusMap = { available: '报名中', full: '已满员', ended: '已结束', cancelled: '已取消' }
    return { ...item, statusText: statusMap[item.status] || '报名中' }
  },

  formatExpert(item) {
    return { ...item, expertise: item.expertiseDetail || item.field || '综合服务' }
  },

  formatActivity(item) {
    const typeMap = { volunteer: '志愿服务', family: '亲子活动', training: '技能培训', guide: '指导活动', community: '社区活动' }
    let startTimeText = ''
    if (item.startTime) {
      const date = new Date(item.startTime)
      startTimeText = `${date.getMonth() + 1}月${date.getDate()}日`
    }
    return { ...item, activityTypeText: typeMap[item.activityType] || '社区活动', startTimeText }
  },

  goCourse() { wx.navigateTo({ url: '/pages/course/list/list' }) },
  goCourseDetail(e) { wx.navigateTo({ url: `/pages/course/detail/detail?id=${e.currentTarget.dataset.id}` }) },
  goExpert() { wx.navigateTo({ url: '/pages/expert/list/list' }) },
  goExpertDetail(e) { wx.navigateTo({ url: `/pages/expert/detail/detail?id=${e.currentTarget.dataset.id}` }) },
  goActivity() { wx.navigateTo({ url: '/pages/activity/list/list' }) },
  goActivityDetail(e) { wx.navigateTo({ url: `/pages/activity/detail/detail?id=${e.currentTarget.dataset.id}` }) },

  onPullDownRefresh() {
    this.loadAllData().then(() => { wx.stopPullDownRefresh() })
  }
})
