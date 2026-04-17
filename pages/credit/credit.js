Page({
  data: {
    role: '',
    roleName: '',
    creditScore: 100,
    dimensions: [],
    records: [],
    benefits: [],
    rules: {
      add: [],
      deduct: []
    },
    level: '',
    levelText: '',
    loading: true
  },

  onLoad() {
    this.loadCreditData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  loadCreditData() {
    try {
      const app = getApp()
      const userInfo = app.globalData.userInfo || {}

      const role = userInfo.role || 'parent'
      const creditScore = userInfo.creditScore || 100
      const roleConfig = this.getRoleConfig(role)
      const level = this.calculateLevel(creditScore)
      const levelText = this.getLevelText(level)
      const records = this.getMockRecords(role)

      this.setData({
        role,
        roleName: roleConfig.name,
        creditScore,
        dimensions: roleConfig.dimensions,
        benefits: roleConfig.benefits,
        rules: roleConfig.rules,
        level,
        levelText,
        records,
        loading: false
      })
    } catch (err) {
      console.error('加载信用数据失败:', err)
      // 使用默认数据
      const defaultConfig = this.getRoleConfig('parent')
      this.setData({
        role: 'parent',
        roleName: defaultConfig.name,
        creditScore: 100,
        dimensions: defaultConfig.dimensions,
        benefits: defaultConfig.benefits,
        rules: defaultConfig.rules,
        level: 'excellent',
        levelText: '优秀',
        records: this.getMockRecords('parent'),
        loading: false
      })
    }
  },

  getRoleConfig(role) {
    const configs = {
      parent: {
        name: '家长信用中心',
        dimensions: [
          { key: 'fulfillment', name: '履约守约', icon: '✅', score: 100 },
          { key: 'review', name: '评价规范', icon: '⭐', score: 100 },
          { key: 'booking', name: '预约合规', icon: '📅', score: 100 }
        ],
        benefits: [
          { level: '优秀 (≥90)', rights: '优先报名、优惠资格', unlocked: true },
          { level: '良好 (70-89)', rights: '正常使用', unlocked: true },
          { level: '待提升 (<70)', rights: '限制预约热门课程', unlocked: false }
        ],
        rules: {
          add: [
            { rule: '按时到场上课', points: '+2' },
            { rule: '真实客观评价', points: '+1' },
            { rule: '无取消、无爽约', points: '+1/次' }
          ],
          deduct: [
            { rule: '无故缺席课程', points: '-5' },
            { rule: '临时无故取消课程', points: '-3' },
            { rule: '恶意评价/虚假投诉', points: '-10' }
          ]
        }
      },
      mentor: {
        name: '银龄导师信用中心',
        dimensions: [
          { key: 'teaching', name: '授课履约', icon: '📚', score: 100 },
          { key: 'quality', name: '服务质量', icon: '🏆', score: 100 },
          { key: 'praise', name: '家长好评', icon: '⭐', score: 100 },
          { key: 'compliance', name: '合规安全', icon: '🛡️', score: 100 }
        ],
        benefits: [
          { level: '优秀 (≥90)', rights: '可接全部课程、晋升资格', unlocked: true },
          { level: '良好 (70-89)', rights: '正常授课', unlocked: true },
          { level: '待提升 (<70)', rights: '暂停授课、需重新培训', unlocked: false }
        ],
        rules: {
          add: [
            { rule: '按时授课完成', points: '+3' },
            { rule: '家长好评', points: '+2' },
            { rule: '零投诉', points: '+1/次' }
          ],
          deduct: [
            { rule: '迟到/爽约', points: '-8' },
            { rule: '服务投诉有效', points: '-15' },
            { rule: '违规授课', points: '-20' }
          ]
        }
      },
      volunteer: {
        name: '志愿者信用中心',
        dimensions: [
          { key: 'activity', name: '活动履约', icon: '🎯', score: 100 },
          { key: 'attitude', name: '服务态度', icon: '💙', score: 100 },
          { key: 'completion', name: '任务完成', icon: '✨', score: 100 }
        ],
        benefits: [
          { level: '优秀 (≥90)', rights: '优先参与官方活动、时长认证', unlocked: true },
          { level: '良好 (70-89)', rights: '正常参与', unlocked: true },
          { level: '待提升 (<70)', rights: '限制报名新活动', unlocked: false }
        ],
        rules: {
          add: [
            { rule: '按时完成志愿任务', points: '+3' },
            { rule: '服务好评', points: '+2' }
          ],
          deduct: [
            { rule: '报名不到场', points: '-6' },
            { rule: '中途退出任务', points: '-8' },
            { rule: '违规行为', points: '-12' }
          ]
        }
      }
    }
    return configs[role] || configs.parent
  },

  calculateLevel(score) {
    if (score >= 90) return 'excellent'
    if (score >= 70) return 'good'
    return 'poor'
  },

  getLevelText(level) {
    const texts = {
      excellent: '优秀',
      good: '良好',
      poor: '待提升'
    }
    return texts[level] || '优秀'
  },

  getMockRecords(role) {
    const now = new Date()
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
    const mockData = {
      parent: [
        { _id: '1', type: 'earn', points: 2, reason: '按时到场上课', createdAt: dateStr },
        { _id: '2', type: 'earn', points: 1, reason: '真实客观评价', createdAt: dateStr },
        { _id: '3', type: 'earn', points: 1, reason: '无取消、无爽约', createdAt: dateStr }
      ],
      mentor: [
        { _id: '1', type: 'earn', points: 3, reason: '按时授课完成', createdAt: dateStr },
        { _id: '2', type: 'earn', points: 2, reason: '家长好评', createdAt: dateStr }
      ],
      volunteer: [
        { _id: '1', type: 'earn', points: 3, reason: '按时完成志愿任务', createdAt: dateStr },
        { _id: '2', type: 'earn', points: 2, reason: '服务好评', createdAt: dateStr }
      ]
    }
    return mockData[role] || mockData.parent
  }
})
