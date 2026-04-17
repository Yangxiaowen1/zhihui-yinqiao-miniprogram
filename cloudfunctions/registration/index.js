const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 报名管理云函数
 * action: list | detail | scan | getStatistics
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await getMyRegistrations(openid, data)
      case 'detail':
        return await getRegistrationDetail(data.id)
      case 'scan':
        return await scanAttendance(openid, data)
      case 'getStatistics':
        return await getStatistics(openid)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('报名管理云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 获取我的报名列表
 */
async function getMyRegistrations(openid, data) {
  const { type, status, page = 1, pageSize = 10 } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  const conditions = { userId }
  
  if (type) {
    conditions.userType = type // course/expert/activity
  }
  if (status) {
    conditions.status = status
  }
  
  const countRes = await db.collection('registrations').where(conditions).count()
  
  const listRes = await db.collection('registrations')
    .where(conditions)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  // 格式化数据
  const list = listRes.data.map(item => ({
    ...item,
    statusText: getStatusText(item.status),
    statusClass: getStatusClass(item.status),
    typeText: getTypeText(item.userType)
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
 * 获取报名详情
 */
async function getRegistrationDetail(registrationId) {
  if (!registrationId) {
    return { success: false, errMsg: '报名ID不能为空' }
  }
  
  const res = await db.collection('registrations').doc(registrationId).get()
  
  if (!res.data) {
    return { success: false, errMsg: '报名记录不存在' }
  }
  
  const registration = res.data
  registration.statusText = getStatusText(registration.status)
  registration.statusClass = getStatusClass(registration.status)
  registration.typeText = getTypeText(registration.userType)
  
  // 获取关联的目标详情
  let targetDetail = null
  const targetCol = registration.userType === 'course' ? 'courses' : 
                    registration.userType === 'expert' ? 'experts' : 'activities'
  
  const targetRes = await db.collection(targetCol).doc(registration.targetId).get()
  if (targetRes.data) {
    targetDetail = targetRes.data
  }
  
  return {
    success: true,
    data: {
      registration,
      targetDetail
    }
  }
}

/**
 * 扫码签到
 */
async function scanAttendance(openid, data) {
  const { qrCode, registrationId } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  let registration
  
  if (registrationId) {
    const regRes = await db.collection('registrations').doc(registrationId).get()
    if (!regRes.data || regRes.data.userId !== userId) {
      return { success: false, errMsg: '报名记录不存在' }
    }
    registration = regRes.data
  } else if (qrCode) {
    // 通过二维码查找报名记录
    const regRes = await db.collection('registrations').where({
      userId,
      targetId: qrCode, // 假设二维码内容是targetId
      status: 'registered'
    }).get()
    
    if (regRes.data.length === 0) {
      return { success: false, errMsg: '未找到有效报名记录' }
    }
    registration = regRes.data[0]
  } else {
    return { success: false, errMsg: '缺少签到参数' }
  }
  
  if (registration.status !== 'registered') {
    return { success: false, errMsg: '该报名状态无法签到' }
  }
  
  // 更新签到状态
  await db.collection('registrations').doc(registration._id).update({
    data: {
      status: 'attended',
      attendTime: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })
  
  // 增加信用分
  await addCredit(userId, 5, '参加活动签到')
  
  return { success: true, message: '签到成功' }
}

/**
 * 获取用户统计数据
 */
async function getStatistics(openid) {
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  const user = userRes.data[0]
  
  // 统计各类型报名数量
  const [courseCount, expertCount, activityCount] = await Promise.all([
    db.collection('registrations').where({ userId, userType: 'course', status: _.in(['registered', 'attended']) }).count(),
    db.collection('registrations').where({ userId, userType: 'expert', status: _.in(['registered', 'attended']) }).count(),
    db.collection('registrations').where({ userId, userType: 'activity', status: _.in(['registered', 'attended']) }).count()
  ])
  
  // 统计已完成数量
  const completedCount = await db.collection('registrations')
    .where({ userId, status: _.in(['attended', 'completed']) })
    .count()
  
  // 获取信用分变动趋势（最近7天）
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const creditRecords = await db.collection('credit_records')
    .where({
      userId,
      createdAt: _.gte(sevenDaysAgo)
    })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
  
  return {
    success: true,
    data: {
      userInfo: {
        creditScore: user.creditScore,
        identity: user.identity
      },
      counts: {
        course: courseCount.total,
        expert: expertCount.total,
        activity: activityCount.total,
        completed: completedCount.total
      },
      creditRecords: creditRecords.data
    }
  }
}

// ========== 辅助函数 ==========

function getStatusText(status) {
  const map = {
    registered: '已报名',
    attended: '已签到',
    cancelled: '已取消',
    completed: '已完成'
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    registered: 'status-registered',
    attended: 'status-attended',
    cancelled: 'status-cancelled',
    completed: 'status-completed'
  }
  return map[status] || ''
}

function getTypeText(type) {
  const map = {
    course: '课程',
    expert: '专家咨询',
    activity: '活动'
  }
  return map[type] || type
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
