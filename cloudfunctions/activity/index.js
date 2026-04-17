const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 活动云函数
 * action: list | detail | register | cancel | createTeam | joinTeam | getTeamInfo | getPreview | checkRegistration | getRecap
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await getActivities(data)
      case 'detail':
        return await getActivityDetail(data.id)
      case 'register':
        return await registerActivity(openid, data)
      case 'cancel':
        return await cancelRegistration(openid, data)
      case 'createTeam':
        return await createTeam(openid, data)
      case 'joinTeam':
        return await joinTeam(openid, data)
      case 'getTeamInfo':
        return await getTeamInfo(data.teamId)
      case 'getPreview':
        return await getActivityPreview(data)
      case 'checkRegistration':
        return await checkActivityRegistration(openid, data)
      case 'getRecap':
        return await getActivityRecap(data)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('活动云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 获取活动列表
 */
async function getActivities(data) {
  const { activityType, status, community, role, userId, page = 1, pageSize = 10 } = data
  
  let query = db.collection('activities')
  const conditions = {}
  
  if (activityType) {
    conditions.activityType = activityType
  }
  if (status) {
    conditions.status = status
  } else {
    // 默认不显示已取消
    conditions.status = _.in(['available', 'full', 'ended'])
  }
  if (community) {
    conditions.community = community
  }

  // 角色过滤：默认展示所有活动，但可按角色优先展示
  // 不强制过滤，前端展示时根据角色调整UI
  
  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions)
  }
  
  const countRes = await query.count()
  const listRes = await query
    .orderBy('startTime', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  const list = listRes.data.map(item => ({
    ...item,
    statusText: getStatusText(item.status),
    statusClass: getStatusClass(item.status),
    friendlyTime: formatFriendlyTime(item.startTime),
    remainingSpots: item.maxParticipants - item.currentParticipants
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
 * 获取活动详情
 */
async function getActivityDetail(activityId) {
  if (!activityId) {
    return { success: false, errMsg: '活动ID不能为空' }
  }
  
  const res = await db.collection('activities').doc(activityId).get()
  
  if (!res.data) {
    return { success: false, errMsg: '活动不存在' }
  }
  
  const activity = res.data
  activity.statusText = getStatusText(activity.status)
  activity.statusClass = getStatusClass(activity.status)
  activity.friendlyTime = formatFriendlyTime(activity.startTime)
  activity.remainingSpots = activity.maxParticipants - activity.currentParticipants
  
  return { success: true, data: activity }
}

/**
 * 活动报名
 */
async function registerActivity(openid, data) {
  const { activityId, identity, name, phone, teamId } = data
  
  if (!activityId || !name || !phone) {
    return { success: false, errMsg: '请填写完整信息' }
  }
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const userId = userRes.data[0]._id
  
  // 获取活动信息
  const activityRes = await db.collection('activities').doc(activityId).get()
  if (!activityRes.data) {
    return { success: false, errMsg: '活动不存在' }
  }
  const activity = activityRes.data
  
  // 检查活动状态
  if (activity.status === 'ended') {
    return { success: false, errMsg: '活动已结束' }
  }
  if (activity.status === 'cancelled') {
    return { success: false, errMsg: '活动已取消' }
  }
  if (activity.currentParticipants >= activity.maxParticipants) {
    return { success: false, errMsg: '活动名额已满' }
  }
  
  // 检查是否已报名
  const existRes = await db.collection('registrations').where({
    userId,
    userType: 'activity',
    targetId: activityId,
    status: _.in(['registered', 'attended'])
  }).get()
  
  if (existRes.data.length > 0) {
    return { success: false, errMsg: '您已报名该活动' }
  }
  
  // 如果是组队报名
  let teamInfo = null
  if (teamId) {
    const teamRes = await db.collection('teams').doc(teamId).get()
    if (teamRes.data && teamRes.data.status !== 'full') {
      teamInfo = {
        teamId,
        teamName: teamRes.data.name || `${teamRes.data.members.length + 1}人小队`
      }
    }
  }
  
  const transaction = await db.startTransaction()
  
  try {
    // 创建报名记录
    await transaction.collection('registrations').add({
      data: {
        userId,
        userType: 'activity',
        targetId: activityId,
        targetName: activity.name,
        status: 'registered',
        registerTime: db.serverDate(),
        identity: identity || 'elderly', // elderly/youth
        contactInfo: { name, phone },
        teamInfo,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    // 更新活动人数
    const newCount = activity.currentParticipants + 1
    const updateData = {
      currentParticipants: newCount,
      updatedAt: db.serverDate()
    }
    
    if (newCount >= activity.maxParticipants) {
      updateData.status = 'full'
    }
    
    await transaction.collection('activities').doc(activityId).update({
      data: updateData
    })
    
    // 如果是组队，更新队伍信息
    if (teamId && teamInfo) {
      await transaction.collection('teams').doc(teamId).update({
        data: {
          members: _.push({
            userId,
            identity: identity || 'elderly',
            joinTime: db.serverDate()
          }),
          updatedAt: db.serverDate()
        }
      })
    }
    
    await transaction.commit()
    
    // 增加信用分
    await addCredit(userId, activity.points || 3, '报名参加活动')
    
    // 发送通知
    await sendNotification(userId, 'activity', '报名成功',
      `您已成功报名「${activity.name}」活动，请按时参加。`)
    
    return { success: true, message: '报名成功' }
    
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

/**
 * 取消活动报名
 */
async function cancelRegistration(openid, data) {
  const { registrationId } = data
  
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  const regRes = await db.collection('registrations').doc(registrationId).get()
  if (!regRes.data || regRes.data.userId !== userId) {
    return { success: false, errMsg: '报名记录不存在' }
  }
  
  if (regRes.data.status !== 'registered') {
    return { success: false, errMsg: '该报名无法取消' }
  }
  
  const transaction = await db.startTransaction()
  
  try {
    await transaction.collection('registrations').doc(registrationId).update({
      data: {
        status: 'cancelled',
        cancelTime: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    
    const activityRes = await transaction.collection('activities').doc(regRes.data.targetId).get()
    if (activityRes.data) {
      const newCount = Math.max(0, activityRes.data.currentParticipants - 1)
      const updateData = {
        currentParticipants: newCount,
        updatedAt: db.serverDate()
      }
      
      if (activityRes.data.status === 'full' && newCount < activityRes.data.maxParticipants) {
        updateData.status = 'available'
      }
      
      await transaction.collection('activities').doc(regRes.data.targetId).update({
        data: updateData
      })
    }
    
    await transaction.commit()
    
    await addCredit(userId, -2, '取消活动报名')
    
    return { success: true, message: '已取消报名' }
    
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

/**
 * 创建组队
 */
async function createTeam(openid, data) {
  const { activityId, maxMembers = 4 } = data
  
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const userId = userRes.data[0]._id
  
  const team = {
    activityId,
    leaderId: userId,
    members: [{
      userId,
      identity: userRes.data[0].identity || 'elderly',
      joinTime: db.serverDate()
    }],
    maxMembers,
    status: 'open',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  
  const res = await db.collection('teams').add({ data: team })
  team._id = res._id
  
  return { success: true, data: team, message: '组队创建成功' }
}

/**
 * 加入组队
 */
async function joinTeam(openid, data) {
  const { teamId } = data
  
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '请先登录' }
  }
  const userId = userRes.data[0]._id
  
  const teamRes = await db.collection('teams').doc(teamId).get()
  if (!teamRes.data) {
    return { success: false, errMsg: '队伍不存在' }
  }
  
  const team = teamRes.data
  
  if (team.status !== 'open') {
    return { success: false, errMsg: '该队伍已满或已关闭' }
  }
  
  if (team.members.length >= team.maxMembers) {
    return { success: false, errMsg: '队伍人数已满' }
  }
  
  // 检查是否已在队伍中
  const inTeam = team.members.some(m => m.userId === userId)
  if (inTeam) {
    return { success: false, errMsg: '您已在队伍中' }
  }
  
  const updateData = {
    members: _.push({
      userId,
      identity: userRes.data[0].identity || 'elderly',
      joinTime: db.serverDate()
    }),
    updatedAt: db.serverDate()
  }
  
  if (team.members.length + 1 >= team.maxMembers) {
    updateData.status = 'full'
  }
  
  await db.collection('teams').doc(teamId).update({
    data: updateData
  })
  
  return { success: true, message: '加入成功' }
}

/**
 * 获取队伍信息
 */
async function getTeamInfo(teamId) {
  const res = await db.collection('teams').doc(teamId).get()
  
  if (!res.data) {
    return { success: false, errMsg: '队伍不存在' }
  }
  
  // 获取成员详细信息
  const memberIds = res.data.members.map(m => m.userId)
  const usersRes = await db.collection('users')
    .where({ _id: _.in(memberIds) })
    .field({ nickName: true, avatarUrl: true, identity: true })
    .get()
  
  const userMap = {}
  usersRes.data.forEach(u => {
    userMap[u._id] = u
  })
  
  const members = res.data.members.map(m => ({
    ...m,
    ...userMap[m.userId]
  }))
  
  return {
    success: true,
    data: {
      ...res.data,
      members
    }
  }
}

// ========== 辅助函数 ==========

function getStatusText(status) {
  const map = {
    available: '可报名',
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
 * 获取活动预览列表（聚合页使用）
 * 支持角色过滤：
 * - volunteer: 查看志愿活动
 * - expert: 查看指导类活动
 * - parent: 查看亲子活动
 */
async function getActivityPreview(data) {
  const { role = 'parent', userId, limit = 3 } = data

  let conditions = {
    status: _.in(['available', 'full'])
  }

  // 角色过滤
  if (role === 'volunteer') {
    // 青年志愿者：查看志愿活动
    conditions.activityType = 'volunteer'
  } else if (role === 'expert') {
    // 银龄导师：查看指导类活动
    conditions.activityType = _.in(['training', 'guide'])
  } else {
    // 家长：查看亲子活动
    conditions.activityType = _.in(['family', 'community'])
  }

  const listRes = await db.collection('activities')
    .where(conditions)
    .orderBy('startTime', 'asc')
    .limit(Math.min(limit, 20))
    .get()

  const list = listRes.data.map(item => ({
    _id: item._id,
    name: item.name,
    activityType: item.activityType,
    place: item.place,
    startTime: item.startTime,
    status: item.status,
    statusText: getStatusText(item.status),
    currentParticipants: item.currentParticipants || 0,
    maxParticipants: item.maxParticipants || 20,
    friendlyTime: formatFriendlyTime(item.startTime)
  }))

  return { success: true, data: { list } }
}

/**
 * 检查当前用户报名状态
 */
async function checkActivityRegistration(openid, data) {
  const { activityId } = data
  if (!activityId) {
    return { success: false, errMsg: '活动ID不能为空' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  const regRes = await db.collection('registrations').where({
    userId,
    userType: 'activity',
    targetId: activityId,
    status: _.in(['registered', 'attended', 'completed'])
  }).get()

  if (regRes.data.length > 0) {
    const reg = regRes.data[0]
    return { success: true, data: reg }
  }

  return { success: true, data: null }
}

/**
 * 获取活动回顾（已结束活动）
 */
async function getActivityRecap(data) {
  const { activityId } = data
  if (!activityId) {
    return { success: false, errMsg: '活动ID不能为空' }
  }

  // 获取活动信息作为回顾基础
  const actRes = await db.collection('activities').doc(activityId).get()
  if (!actRes.data) {
    return { success: false, errMsg: '活动不存在' }
  }

  const activity = actRes.data

  // 统计报名人数
  const regCountRes = await db.collection('registrations').where({
    userType: 'activity',
    targetId: activityId,
    status: _.in(['attended', 'completed'])
  }).count()

  // 志愿者时长统计
  const volunteerRes = await db.collection('registrations').where({
    userType: 'activity',
    targetId: activityId,
    identity: 'youth',
    status: _.in(['attended', 'completed'])
  }).get()

  const totalHours = volunteerRes.data.reduce((sum, r) => sum + (r.volunteerHours || 2), 0)

  return {
    success: true,
    data: {
      content: activity.recap || activity.summary || `${activity.name}已圆满结束，感谢所有参与者的支持！`,
      summary: activity.recap || '',
      stats: {
        participants: regCountRes.total,
        hours: totalHours
      }
    }
  }
}
