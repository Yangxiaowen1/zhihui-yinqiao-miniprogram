const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 专家云函数
 * action: list | detail | getSlots | book | getRecords | updateRecord | getPreview | getComments
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await getExperts(data)
      case 'detail':
        return await getExpertDetail(data)
      case 'getSlots':
        return await getAvailableSlots(data.expertId)
      case 'book':
        return await bookExpert(openid, data)
      case 'getRecords':
        return await getConsultRecords(openid, data)
      case 'updateRecord':
        return await updateConsultRecord(openid, data)
      case 'getPreview':
        return await getExpertPreview(data)
      case 'getComments':
        return await getExpertComments(data)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('专家云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 获取专家列表
 * 从 users 表查询 role='expert' 的用户
 */
async function getExperts(data) {
  const { role, userId, field, starLevel, page = 1, pageSize = 10 } = data

  // 如果是银龄导师查看自己的信息
  if (role === 'expert' && userId) {
    const userRes = await db.collection('users').doc(userId).get()
    if (userRes.data && userRes.data.role === 'expert') {
      const user = userRes.data
      const info = user.expertInfo || {}
      const list = [{
        _id: user._id,
        name: user.nickName || user.realName || '导师',
        identity: user.identity || '银龄导师',
        community: user.community || '',
        title: info.expertise || '综合服务',
        field: info.expertiseDetail || '',
        starLevel: info.starLevel || 1,
        avgRating: info.avgRating || 5.0,
        consultCount: info.totalStudents || 0,
        status: 'available',
        statusText: '活跃',
        statusClass: 'status-available'
      }]
      return { success: true, data: { list, total: 1, page: 1, pageSize: 20 } }
    }
    return { success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } }
  }

  // 家长/志愿者：查询所有专家用户
  let conditions = { role: 'expert', status: 'active' }

  // 从 users 表查询
  const usersRes = await db.collection('users')
    .where(conditions)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const list = usersRes.data.map(user => {
    const info = user.expertInfo || {}
    return {
      _id: user._id,
      name: user.nickName || user.realName || '导师',
      identity: user.identity || '银龄导师',
      community: user.community || '',
      title: info.expertise || '综合服务',
      field: info.expertiseDetail || '',
      starLevel: info.starLevel || 1,
      avgRating: info.avgRating || 5.0,
      consultCount: info.totalStudents || 0,
      status: 'available',
      statusText: '可预约',
      statusClass: 'status-available'
    }
  })

  // 如果 users 表没有专家数据，从 experts 表查询（兼容旧数据）
  if (list.length === 0) {
    const expertConditions = { status: 'available' }
    const expertRes = await db.collection('experts')
      .where(expertConditions)
      .orderBy('rating', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: {
        list: expertRes.data.map(item => ({
          _id: item._id,
          name: item.name,
          identity: '银龄导师',
          community: '',
          title: item.title,
          field: item.field,
          starLevel: item.rating >= 4.8 ? 3 : item.rating >= 4.5 ? 2 : 1,
          avgRating: item.rating,
          consultCount: item.consultCount || 0,
          status: item.status,
          statusText: getStatusText(item.status),
          statusClass: getStatusClass(item.status)
        })),
        total: expertRes.data.length,
        page,
        pageSize
      }
    }
  }

  return {
    success: true,
    data: { list, total: list.length, page, pageSize }
  }
}

/**
 * 获取专家详情
 */
async function getExpertDetail(data) {
  const expertId = data.id
  if (!expertId) {
    return { success: false, errMsg: '专家ID不能为空' }
  }

  // 先从 experts 表查
  let expert = null
  try {
    const res = await db.collection('experts').doc(expertId).get()
    if (res.data) {
      expert = res.data
    }
  } catch (e) {
    // experts 表可能不存在该记录，尝试 users 表
  }

  // 如果 experts 表没有，从 users 表查
  if (!expert) {
    try {
      const userRes = await db.collection('users').doc(expertId).get()
      if (userRes.data && userRes.data.role === 'expert') {
        const user = userRes.data
        const info = user.expertInfo || {}
        expert = {
          _id: user._id,
          name: user.nickName || user.realName || '导师',
          identity: user.identity || '银龄导师',
          community: user.community || '',
          title: info.expertise || '综合服务',
          field: info.expertiseDetail || '',
          starLevel: info.starLevel || 1,
          avgRating: info.avgRating || 5.0,
          totalRatings: info.totalRatings || 0,
          totalHours: info.totalHours || 0,
          totalStudents: info.totalStudents || 0,
          bio: info.bio || info.introduction || '专业咨询服务',
          status: 'available',
          consultCount: info.totalStudents || 0
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!expert) {
    return { success: false, errMsg: '专家不存在' }
  }

  expert.statusText = getStatusText(expert.status)
  expert.statusClass = getStatusClass(expert.status)

  return { success: true, data: expert }
}

/**
 * 获取专家可预约时段
 */
async function getAvailableSlots(expertId) {
  if (!expertId) {
    return { success: false, errMsg: '专家ID不能为空' }
  }
  
  const expertRes = await db.collection('experts').doc(expertId).get()
  if (!expertRes.data) {
    return { success: false, errMsg: '专家不存在' }
  }
  
  const expert = expertRes.data
  const now = new Date()
  
  // 生成未来7天的可预约时段
  const slots = []
  for (let i = 1; i <= 7; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() + i)
    
    const dateStr = formatDate(date, 'YYYY-MM-DD')
    const displayDate = formatDate(date, 'MM月DD日')
    
    // 每天生成3个时段
    const timeSlots = ['09:00-10:00', '14:00-15:00', '15:00-16:00']
    
    for (const time of timeSlots) {
      // 检查该时段是否已被预约
      const bookingRes = await db.collection('registrations').where({
        userType: 'expert',
        targetId: expertId,
        'slotInfo.date': dateStr,
        'slotInfo.time': time,
        status: _.in(['registered', 'attended'])
      }).get()
      
      slots.push({
        id: `${dateStr}_${time}`,
        date: dateStr,
        displayDate,
        time,
        displayTime: `${displayDate} ${time}`,
        available: bookingRes.data.length === 0
      })
    }
  }
  
  return { success: true, data: slots }
}

/**
 * 预约专家
 */
async function bookExpert(openid, data) {
  const { expertId, slotId, slotInfo, question, contactName, contactPhone } = data
  
  if (!expertId || !slotId || !contactName || !contactPhone) {
    return { success: false, errMsg: '请填写完整信息' }
  }
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const userId = userRes.data[0]._id
  
  // 获取专家信息
  const expertRes = await db.collection('experts').doc(expertId).get()
  if (!expertRes.data) {
    return { success: false, errMsg: '专家不存在' }
  }
  const expert = expertRes.data
  
  // 检查时段是否已被预约
  const existRes = await db.collection('registrations').where({
    userType: 'expert',
    targetId: expertId,
    'slotInfo.date': slotInfo.date,
    'slotInfo.time': slotInfo.time,
    status: _.in(['registered', 'attended'])
  }).get()
  
  if (existRes.data.length > 0) {
    return { success: false, errMsg: '该时段已被预约' }
  }
  
  // 创建预约记录
  await db.collection('registrations').add({
    data: {
      userId,
      userType: 'expert',
      targetId: expertId,
      targetName: expert.name,
      status: 'registered',
      registerTime: db.serverDate(),
      slotInfo: {
        id: slotId,
        date: slotInfo.date,
        time: slotInfo.time,
        displayTime: slotInfo.displayTime
      },
      consultQuestion: question || '',
      contactInfo: {
        name: contactName,
        phone: contactPhone
      },
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })
  
  // 更新专家咨询次数
  await db.collection('experts').doc(expertId).update({
    data: {
      consultCount: _.inc(1),
      updatedAt: db.serverDate()
    }
  })
  
  // 增加信用分
  await addCredit(userId, 3, '预约专家咨询')
  
  // 发送通知
  await sendNotification(userId, 'consult', '预约成功',
    `您已成功预约${expert.name}专家的咨询，时间为${slotInfo.displayTime}，请准时参加。`)
  
  return { success: true, message: '预约成功' }
}

/**
 * 获取咨询记录
 */
async function getConsultRecords(openid, data) {
  const { page = 1, pageSize = 10 } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  const countRes = await db.collection('registrations')
    .where({ userId, userType: 'expert' })
    .count()
  
  const listRes = await db.collection('registrations')
    .where({ userId, userType: 'expert' })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  const list = listRes.data.map(item => ({
    ...item,
    statusText: getRegistrationStatusText(item.status)
  }))
  
  return {
    success: true,
    data: {
      list,
      total: countRes.total,
      page,
      pageSize
    }
  }
}

/**
 * 更新咨询记录（添加咨询结果）
 */
async function updateConsultRecord(openid, data) {
  const { registrationId, consultResult } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  
  await db.collection('registrations').doc(registrationId).update({
    data: {
      consultResult,
      status: 'completed',
      updatedAt: db.serverDate()
    }
  })
  
  return { success: true, message: '记录已更新' }
}

// ========== 辅助函数 ==========

function getStatusText(status) {
  const map = {
    available: '可预约',
    busy: '忙碌中',
    offline: '离线'
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    available: 'status-available',
    busy: 'status-busy',
    offline: 'status-offline'
  }
  return map[status] || ''
}

function getRegistrationStatusText(status) {
  const map = {
    registered: '已预约',
    attended: '已咨询',
    cancelled: '已取消',
    completed: '已完成'
  }
  return map[status] || status
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const map = {
    YYYY: d.getFullYear(),
    MM: (d.getMonth() + 1).toString().padStart(2, '0'),
    DD: d.getDate().toString().padStart(2, '0')
  }
  return format.replace(/YYYY|MM|DD/g, match => map[match])
}

async function addCredit(userId, points, reason) {
  await db.collection('credit_records').add({
    data: {
      userId,
      type: points > 0 ? 'earn' : 'deduct',
      points: Math.abs(points),
      reason,
      createdAt: db.serverDate()
    }
  })
  
  await db.collection('users').doc(userId).update({
    data: {
      creditScore: _.inc(points),
      updatedAt: db.serverDate()
    }
  })
}

async function sendNotification(userId, type, title, content) {
  await db.collection('notifications').add({
    data: {
      userId,
      type,
      title,
      content,
      isRead: false,
      createdAt: db.serverDate()
    }
  })
}

/**
 * 获取专家预览列表（聚合页使用）
 * 从 users 表查询 role='expert' 的用户
 */
async function getExpertPreview(data) {
  const { role = 'parent', userId, limit = 3 } = data

  // 如果是银龄导师查看自己的信息
  if (role === 'expert' && userId) {
    const userRes = await db.collection('users').doc(userId).get()
    if (userRes.data && userRes.data.role === 'expert') {
      const user = userRes.data
      const info = user.expertInfo || {}
      return {
        success: true,
        data: {
          list: [{
            _id: user._id,
            name: user.nickName || user.realName || '导师',
            expertise: info.expertise || '综合服务',
            expertiseDetail: info.expertiseDetail || '',
            starLevel: info.starLevel || 1,
            avgRating: info.avgRating || 5.0,
            totalRatings: info.totalRatings || 0,
            totalHours: info.totalHours || 0
          }]
        }
      }
    }
    return { success: true, data: { list: [] } }
  }

  // 从 users 表查询专家用户
  const usersRes = await db.collection('users')
    .where({
      role: 'expert',
      status: 'active'
    })
    .limit(Math.min(limit, 20))
    .get()

  let list = usersRes.data.map(user => {
    const info = user.expertInfo || {}
    return {
      _id: user._id,
      name: user.nickName || user.realName || '导师',
      expertise: info.expertise || '综合服务',
      expertiseDetail: info.expertiseDetail || '',
      starLevel: info.starLevel || 1,
      avgRating: info.avgRating || 5.0,
      totalRatings: info.totalRatings || 0,
      totalHours: info.totalHours || 0
    }
  })

  // 如果 users 表没有数据，从 experts 表查询（兼容旧数据）
  if (list.length === 0) {
    const expertsRes = await db.collection('experts')
      .where({ status: 'available' })
      .orderBy('rating', 'desc')
      .limit(Math.min(limit, 20))
      .get()

    list = expertsRes.data.map(item => ({
      _id: item._id,
      name: item.name,
      expertise: item.title,
      expertiseDetail: item.field,
      starLevel: item.rating >= 4.8 ? 3 : item.rating >= 4.5 ? 2 : 1,
      avgRating: item.rating,
      totalRatings: 0,
      totalHours: item.consultCount || 0
    }))
  }

  return { success: true, data: { list } }
}

/**
 * 获取专家评价列表
 */
async function getExpertComments(data) {
  const { expertId, page = 1, pageSize = 10 } = data
  if (!expertId) {
    return { success: false, errMsg: '专家ID不能为空' }
  }

  // 从 registrations 中查找该专家的已完成咨询，带 feedback 的
  const countRes = await db.collection('registrations').where({
    userType: 'expert',
    targetId: expertId,
    status: _.in(['attended', 'completed']),
    feedback: _.exists(true)
  }).count()

  const listRes = await db.collection('registrations').where({
    userType: 'expert',
    targetId: expertId,
    status: _.in(['attended', 'completed']),
    feedback: _.exists(true)
  })
    .orderBy('updatedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 获取用户名
  const userIds = [...new Set(listRes.data.map(item => item.userId))]
  let userMap = {}
  if (userIds.length > 0) {
    const usersRes = await db.collection('users')
      .where({ _id: _.in(userIds) })
      .field({ nickName: true, realName: true })
      .get()
    usersRes.data.forEach(u => {
      userMap[u._id] = u.nickName || u.realName || '用户'
    })
  }

  const list = listRes.data.map(item => ({
    _id: item._id,
    userName: userMap[item.userId] || '匿名用户',
    rating: item.feedback.rating || 5,
    content: item.feedback.content || '',
    friendlyTime: formatFriendlyTime(item.updatedAt || item.createdAt),
    createdAt: item.feedback.createdAt
  }))

  return {
    success: true,
    data: {
      list,
      total: countRes.total,
      page,
      pageSize
    }
  }
}

function formatFriendlyTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}
