const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

/**
 * 课程云函数
 * action: list | detail | register | cancel | evaluate | getPreview | checkRegistration | getEnrollmentList | updateStatus | checkAssistantStatus | signupAssistant
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await getCourses(data)
      case 'detail':
        return await getCourseDetail(data.id)
      case 'register':
        return await registerCourse(openid, data)
      case 'cancel':
        return await cancelRegistration(openid, data)
      case 'evaluate':
        return await evaluateCourse(openid, data)
      case 'getPreview':
        return await getCoursePreview(data)
      case 'checkRegistration':
        return await checkRegistration(openid, data)
      case 'getEnrollmentList':
        return await getEnrollmentList(data)
      case 'updateStatus':
        return await updateCourseStatus(openid, data)
      case 'checkAssistantStatus':
        return await checkAssistantStatus(openid, data)
      case 'signupAssistant':
        return await signupAssistant(openid, data)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('课程云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 检查当前用户报名状态
 */
async function checkRegistration(openid, data) {
  const { courseId } = data
  if (!courseId) {
    return { success: false, errMsg: '课程ID不能为空' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  const regRes = await db.collection('registrations').where({
    userId,
    userType: 'course',
    targetId: courseId,
    status: _.in(['registered', 'attended', 'completed'])
  }).get()

  if (regRes.data.length > 0) {
    const reg = regRes.data[0]
    reg.friendlyTime = formatFriendlyTime(reg.registerTime)
    return { success: true, data: reg }
  }

  return { success: true, data: null }
}

/**
 * 获取课程报名列表（导师用）
 */
async function getEnrollmentList(data) {
  const { courseId, page = 1, pageSize = 50 } = data
  if (!courseId) {
    return { success: false, errMsg: '课程ID不能为空' }
  }

  const countRes = await db.collection('registrations')
    .where({ userType: 'course', targetId: courseId, status: _.in(['registered', 'attended', 'completed']) })
    .count()

  const listRes = await db.collection('registrations')
    .where({ userType: 'course', targetId: courseId, status: _.in(['registered', 'attended', 'completed']) })
    .orderBy('registerTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  const list = listRes.data.map(item => ({
    ...item,
    statusText: item.status === 'registered' ? '已报名' : item.status === 'attended' ? '已签到' : '已完成',
    userName: item.contactInfo ? item.contactInfo.name : ''
  }))

  return {
    success: true,
    data: { list, total: countRes.total }
  }
}

/**
 * 更新课程状态（导师用）
 */
async function updateCourseStatus(openid, data) {
  const { courseId, status } = data
  if (!courseId || !status) {
    return { success: false, errMsg: '参数不完整' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }

  // 验证用户是课程讲师
  const courseRes = await db.collection('courses').doc(courseId).get()
  if (!courseRes.data) {
    return { success: false, errMsg: '课程不存在' }
  }

  const userId = userRes.data[0]._id
  if (courseRes.data.teacherId !== userId) {
    return { success: false, errMsg: '无权限操作' }
  }

  await db.collection('courses').doc(courseId).update({
    data: { status, updatedAt: db.serverDate() }
  })

  return { success: true, message: '状态已更新' }
}

/**
 * 获取课程列表 - 增强筛选
 */
async function getCourses(data) {
  const { category, status, ageRange, community, role, userId, page = 1, pageSize = 10 } = data
  
  let query = db.collection('courses')
  const conditions = {}
  
  // 角色过滤
  if (role === 'expert' && userId) {
    conditions.teacherId = userId
  } else if (role === 'volunteer') {
    conditions.needAssistant = true
  }

  if (category) {
    conditions.category = category
  }
  if (status) {
    conditions.status = status
  } else if (role !== 'expert') {
    // 非导师默认不显示已取消
    conditions.status = _.in(['available', 'full', 'ended'])
  }
  if (ageRange) {
    conditions.ageRange = ageRange
  }
  if (community) {
    conditions.community = community
  }
  
  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions)
  }
  
  // 获取总数
  const countRes = await query.count()
  
  // 获取列表
  const listRes = await query
    .orderBy('startTime', 'asc')
    .skip((page - 1) * pageSize)
    .limit(Math.min(pageSize, MAX_LIMIT))
    .get()
  
  // 格式化数据
  const list = listRes.data.map(item => ({
    ...item,
    statusText: getStatusText(item.status),
    statusClass: getStatusClass(item.status),
    friendlyTime: formatFriendlyTime(item.startTime)
  }))
  
  return {
    success: true,
    data: {
      list,
      total: countRes.total,
      page,
      pageSize,
      hasMore: page * pageSize < countRes.total
    }
  }
}

/**
 * 获取课程详情
 */
async function getCourseDetail(courseId) {
  if (!courseId) {
    return { success: false, errMsg: '课程ID不能为空' }
  }
  
  const res = await db.collection('courses').doc(courseId).get()
  
  if (!res.data) {
    return { success: false, errMsg: '课程不存在' }
  }
  
  const course = res.data
  course.statusText = getStatusText(course.status)
  course.statusClass = getStatusClass(course.status)
  course.friendlyTime = formatFriendlyTime(course.startTime)
  course.remainingSpots = course.maxParticipants - course.currentParticipants
  
  return { success: true, data: course }
}

/**
 * 报名课程
 */
async function registerCourse(openid, data) {
  const { courseId, name, phone, remark = '' } = data
  
  if (!courseId || !name || !phone) {
    return { success: false, errMsg: '请填写完整信息' }
  }
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const userId = userRes.data[0]._id
  
  // 检查是否已报名
  const existRes = await db.collection('registrations').where({
    userId,
    userType: 'course',
    targetId: courseId,
    status: _.in(['registered', 'attended'])
  }).get()
  
  if (existRes.data.length > 0) {
    return { success: false, errMsg: '您已报名该课程' }
  }
  
  // 获取课程信息
  const courseRes = await db.collection('courses').doc(courseId).get()
  if (!courseRes.data) {
    return { success: false, errMsg: '课程不存在' }
  }
  
  const course = courseRes.data
  
  // 检查课程状态
  if (course.status === 'ended') {
    return { success: false, errMsg: '课程已结束' }
  }
  if (course.status === 'cancelled') {
    return { success: false, errMsg: '课程已取消' }
  }
  if (course.currentParticipants >= course.maxParticipants) {
    return { success: false, errMsg: '课程名额已满' }
  }
  
  // 开启事务
  const transaction = await db.startTransaction()
  
  try {
    // 创建报名记录
    await transaction.collection('registrations').add({
      data: {
        userId,
        userType: 'course',
        targetId: courseId,
        targetName: course.name,
        status: 'registered',
        registerTime: db.serverDate(),
        contactInfo: { name, phone, remark },
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    // 更新课程报名人数
    const newCount = course.currentParticipants + 1
    const updateData = {
      currentParticipants: newCount,
      updatedAt: db.serverDate()
    }
    
    // 如果满了，更新状态
    if (newCount >= course.maxParticipants) {
      updateData.status = 'full'
    }
    
    await transaction.collection('courses').doc(courseId).update({
      data: updateData
    })
    
    await transaction.commit()
    
    // 增加信用分
    await addCredit(userId, 2, '报名参加课程')
    
    // 发送通知
    await sendNotification(userId, 'activity', '报名成功', 
      `您已成功报名「${course.name}」课程，请按时参加。`)
    
    return { success: true, message: '报名成功' }
    
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

/**
 * 取消报名
 */
async function cancelRegistration(openid, data) {
  const { registrationId } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  // 获取报名记录
  const regRes = await db.collection('registrations').doc(registrationId).get()
  if (!regRes.data || regRes.data.userId !== userId) {
    return { success: false, errMsg: '报名记录不存在' }
  }
  
  if (regRes.data.status !== 'registered') {
    return { success: false, errMsg: '该报名无法取消' }
  }
  
  // 开启事务
  const transaction = await db.startTransaction()
  
  try {
    // 更新报名状态
    await transaction.collection('registrations').doc(registrationId).update({
      data: {
        status: 'cancelled',
        cancelTime: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    // 更新课程人数
    const courseRes = await transaction.collection('courses').doc(regRes.data.targetId).get()
    if (courseRes.data) {
      const newCount = Math.max(0, courseRes.data.currentParticipants - 1)
      const updateData = {
        currentParticipants: newCount,
        updatedAt: db.serverDate()
      }
      
      // 如果之前是满员状态，恢复为可报名
      if (courseRes.data.status === 'full' && newCount < courseRes.data.maxParticipants) {
        updateData.status = 'available'
      }
      
      await transaction.collection('courses').doc(regRes.data.targetId).update({
        data: updateData
      })
    }
    
    await transaction.commit()
    
    // 扣除信用分
    await addCredit(userId, -1, '取消课程报名')
    
    return { success: true, message: '已取消报名' }
    
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

/**
 * 课程评价
 */
async function evaluateCourse(openid, data) {
  const { registrationId, rating, content } = data
  
  if (!registrationId || !rating) {
    return { success: false, errMsg: '请完成评价内容' }
  }
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  // 获取报名记录
  const regRes = await db.collection('registrations').doc(registrationId).get()
  if (!regRes.data || regRes.data.userId !== userId) {
    return { success: false, errMsg: '报名记录不存在' }
  }
  
  if (regRes.data.status !== 'attended') {
    return { success: false, errMsg: '请先签到后再评价' }
  }
  
  // 更新评价
  await db.collection('registrations').doc(registrationId).update({
    data: {
      feedback: {
        rating,
        content: content || '',
        createdAt: db.serverDate()
      },
      updatedAt: db.serverDate()
    }
  })
  
  // 增加信用分
  await addCredit(userId, 1, '完成课程评价')
  
  return { success: true, message: '评价成功' }
}

// ========== 辅助函数 ==========

function getStatusText(status) {
  const map = {
    available: '可预约',
    full: '已满员',
    ended: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    available: 'status-available',
    full: 'status-full',
    ended: 'status-ended',
    cancelled: 'status-cancelled'
  }
  return map[status] || ''
}

function formatFriendlyTime(date) {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
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
 * 志愿者：检查助教报名状态
 */
async function checkAssistantStatus(openid, data) {
  const { courseId } = data
  if (!courseId) {
    return { success: false, errMsg: '课程ID不能为空' }
  }
  if (!openid) {
    return { success: false, errMsg: '未获取到用户身份' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  // 检查是否已报名助教
  const regRes = await db.collection('registrations').where({
    userId,
    userType: 'course_assistant',
    targetId: courseId,
    status: _.in(['registered', 'attended'])
  }).get()

  return {
    success: true,
    data: { isAssistant: regRes.data.length > 0 }
  }
}

/**
 * 志愿者：报名课程助教
 */
async function signupAssistant(openid, data) {
  const { courseId } = data
  if (!courseId) {
    return { success: false, errMsg: '课程ID不能为空' }
  }
  if (!openid) {
    return { success: false, errMsg: '未获取到用户身份' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const user = userRes.data[0]

  if (user.role !== 'volunteer') {
    return { success: false, errMsg: '仅志愿者可报名助教' }
  }

  // 获取课程信息
  const courseRes = await db.collection('courses').doc(courseId).get()
  if (!courseRes.data) {
    return { success: false, errMsg: '课程不存在' }
  }

  if (!courseRes.data.needAssistant) {
    return { success: false, errMsg: '该课程不需要助教' }
  }

  // 检查是否已报名
  const existRes = await db.collection('registrations').where({
    userId: user._id,
    userType: 'course_assistant',
    targetId: courseId,
    status: _.in(['registered', 'attended'])
  }).get()

  if (existRes.data.length > 0) {
    return { success: false, errMsg: '您已报名该课程助教' }
  }

  // 创建报名记录
  await db.collection('registrations').add({
    data: {
      userId: user._id,
      userType: 'course_assistant',
      targetId: courseId,
      targetName: courseRes.data.name,
      status: 'registered',
      identity: 'volunteer',
      registerTime: db.serverDate(),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  return { success: true, message: '助教报名成功' }
}

/**
 * 获取课程预览列表（聚合页使用）
 * 支持角色过滤：
 * - parent: 查看所有公开课程
 * - expert: 仅展示自己发布的课程
 * - volunteer: 查看需助教的课程
 */
async function getCoursePreview(data) {
  const { role = 'parent', userId, limit = 3 } = data

  let conditions = {}

  // 角色过滤
  if (role === 'expert') {
    // 银龄导师：仅展示自己发布的课程
    if (userId) {
      conditions.teacherId = userId
    }
  } else if (role === 'volunteer') {
    // 青年志愿者：查看需要助教的课程
    conditions.needAssistant = true
    conditions.status = _.in(['available', 'full'])
  } else {
    // 家长：查看所有公开课程
    conditions.status = _.in(['available', 'full'])
  }

  let query = db.collection('courses')
  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions)
  }

  const listRes = await query
    .orderBy('startTime', 'asc')
    .limit(Math.min(limit, MAX_LIMIT))
    .get()

  const list = listRes.data.map(item => ({
    _id: item._id,
    name: item.name,
    teacherName: item.teacherName || item.teacher,
    status: item.status,
    statusText: getStatusText(item.status),
    currentParticipants: item.currentParticipants || 0,
    maxParticipants: item.maxParticipants || 20,
    startTime: item.startTime,
    friendlyTime: formatFriendlyTime(item.startTime)
  }))

  return {
    success: true,
    data: { list }
  }
}
