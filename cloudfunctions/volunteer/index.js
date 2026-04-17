const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'getProfile':
      return await getProfile(OPENID)
    case 'updateProfile':
      return await updateProfile(OPENID, data)
    case 'logHours':
      return await logHours(OPENID, data)
    case 'getHours':
      return await getHours(OPENID, data)
    case 'getStatistics':
      return await getStatistics(OPENID)
    case 'getTasks':
      return await getTasks(OPENID, data)
    case 'getActivities':
      return await getActivities(data)
    case 'joinActivity':
      return await joinActivity(OPENID, data)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取志愿者档案
async function getProfile(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    if (user.role !== 'volunteer') {
      return { success: false, message: '仅志愿者可查看' }
    }

    return { success: true, data: user }
  } catch (err) {
    console.error('获取志愿者档案失败:', err)
    return { success: false, message: err.message }
  }
}

// 更新志愿者档案
async function updateProfile(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    await db.collection('users').doc(user._id).update({
      data: {
        volunteerInfo: {
          school: data.school,
          totalHours: user.volunteerInfo?.totalHours || 0
        },
        updateTime: db.serverDate()
      }
    })

    return { success: true, message: '更新成功' }
  } catch (err) {
    console.error('更新志愿者档案失败:', err)
    return { success: false, message: err.message }
  }
}

// 记录志愿时长
async function logHours(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    if (user.role !== 'volunteer') {
      return { success: false, message: '仅志愿者可记录时长' }
    }

    const { activityId, activityName, hours, date, pairedWith } = data

    const record = {
      volunteerId: user._id,
      volunteerName: user.name || user.nickName,
      activityId,
      activityName,
      hours,
      date: new Date(date),
      pairedWith: pairedWith || '',
      verified: false,
      verifiedBy: '',
      createTime: db.serverDate()
    }

    await db.collection('volunteer_hours').add({ data: record })

    // 更新累计时长
    await db.collection('users').doc(user._id).update({
      data: {
        'volunteerInfo.totalHours': _.inc(hours),
        updateTime: db.serverDate()
      }
    })

    return { success: true, message: '记录成功' }
  } catch (err) {
    console.error('记录志愿时长失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取志愿时长记录
async function getHours(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const { limit = 20, skip = 0 } = data || {}

    const countRes = await db.collection('volunteer_hours')
      .where({ volunteerId: user._id })
      .count()

    const listRes = await db.collection('volunteer_hours')
      .where({ volunteerId: user._id })
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    return {
      success: true,
      data: {
        list: listRes.data,
        total: countRes.total
      }
    }
  } catch (err) {
    console.error('获取志愿时长失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取志愿者统计数据
async function getStatistics(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    if (user.role !== 'volunteer') {
      return { success: false, message: '仅志愿者可查看' }
    }

    // 累计时长
    const totalHours = user.volunteerInfo?.totalHours || 0

    // 参与活动次数
    const activitiesRes = await db.collection('volunteer_hours')
      .where({ volunteerId: user._id })
      .count()

    // 帮助老人人次（有配对记录）
    const pairedRes = await db.collection('volunteer_hours')
      .where({
        volunteerId: user._id,
        pairedWith: _.neq('')
      })
      .count()

    // 本月时长
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthHoursRes = await db.collection('volunteer_hours')
      .where({
        volunteerId: user._id,
        date: _.gte(monthStart)
      })
      .get()

    const monthHours = monthHoursRes.data.reduce((sum, r) => sum + r.hours, 0)

    return {
      success: true,
      data: {
        totalHours,
        monthHours,
        totalActivities: activitiesRes.total,
        helpedSeniors: pairedRes.total,
        creditScore: user.creditScore || 100
      }
    }
  } catch (err) {
    console.error('获取统计数据失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取助老任务列表
async function getTasks(openid, data) {
  try {
    const { limit = 10, skip = 0 } = data || {}

    // 获取需要志愿者的活动
    const res = await db.collection('activities')
      .where({
        activityType: 'volunteer',
        status: 'available',
        currentParticipants: _.lt(db.command.field('maxParticipants'))
      })
      .orderBy('startTime', 'asc')
      .skip(skip)
      .limit(limit)
      .get()

    return {
      success: true,
      data: res.data
    }
  } catch (err) {
    console.error('获取任务列表失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取青银共创活动列表
async function getActivities(data) {
  try {
    const { limit = 10, skip = 0 } = data || {}

    const res = await db.collection('activities')
      .where({
        activityType: _.in(['cultural', 'volunteer']),
        status: 'available'
      })
      .orderBy('startTime', 'asc')
      .skip(skip)
      .limit(limit)
      .get()

    return {
      success: true,
      data: res.data
    }
  } catch (err) {
    console.error('获取活动列表失败:', err)
    return { success: false, message: err.message }
  }
}

// 参与活动
async function joinActivity(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const { activityId, pairedWith } = data

    // 获取活动信息
    const activityRes = await db.collection('activities').doc(activityId).get()
    const activity = activityRes.data

    // 检查是否已报名
    const existingRes = await db.collection('registrations')
      .where({
        userId: user._id,
        userType: 'activity',
        targetId: activityId
      })
      .count()

    if (existingRes.total > 0) {
      return { success: false, message: '已报名该活动' }
    }

    // 创建报名记录
    await db.collection('registrations').add({
      data: {
        userId: user._id,
        userType: 'activity',
        targetId: activityId,
        targetName: activity.name,
        status: 'registered',
        identity: user.role,
        createTime: db.serverDate()
      }
    })

    // 更新活动参与人数
    await db.collection('activities').doc(activityId).update({
      data: {
        currentParticipants: _.inc(1),
        updateTime: db.serverDate()
      }
    })

    // 如果有配对老人，记录志愿时长
    if (pairedWith && user.role === 'volunteer') {
      await db.collection('volunteer_hours').add({
        data: {
          volunteerId: user._id,
          activityId,
          activityName: activity.name,
          hours: 2,
          date: activity.startTime,
          pairedWith,
          verified: false,
          createTime: db.serverDate()
        }
      })

      // 更新累计时长
      await db.collection('users').doc(user._id).update({
        data: {
          'volunteerInfo.totalHours': _.inc(2),
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true, message: '报名成功' }
  } catch (err) {
    console.error('参与活动失败:', err)
    return { success: false, message: err.message }
  }
}
