const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 消息通知云函数
 * action: list | markRead | markAllRead | getUnreadCount
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'list':
        return await getNotifications(openid, data)
      case 'markRead':
        return await markAsRead(openid, data)
      case 'markAllRead':
        return await markAllAsRead(openid)
      case 'getUnreadCount':
        return await getUnreadCount(openid)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('消息通知云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 获取消息列表
 */
async function getNotifications(openid, data) {
  const { type, isRead, page = 1, pageSize = 20 } = data
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  const conditions = { userId }
  
  if (type) {
    conditions.type = type // system/activity/credit/consult
  }
  if (isRead !== undefined) {
    conditions.isRead = isRead
  }
  
  const countRes = await db.collection('notifications').where(conditions).count()
  
  const listRes = await db.collection('notifications')
    .where(conditions)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  // 格式化数据
  const list = listRes.data.map(item => ({
    ...item,
    typeText: getTypeText(item.type),
    timeAgo: formatTimeAgo(item.createdAt)
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
 * 标记单条消息为已读
 */
async function markAsRead(openid, data) {
  const { notificationId } = data
  
  if (!notificationId) {
    return { success: false, errMsg: '消息ID不能为空' }
  }
  
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  // 验证消息所有权
  const notificationRes = await db.collection('notifications').doc(notificationId).get()
  if (!notificationRes.data || notificationRes.data.userId !== userId) {
    return { success: false, errMsg: '消息不存在' }
  }
  
  await db.collection('notifications').doc(notificationId).update({
    data: {
      isRead: true,
      readAt: db.serverDate()
    }
  })
  
  return { success: true, message: '已标记为已读' }
}

/**
 * 标记所有消息为已读
 */
async function markAllAsRead(openid) {
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id
  
  // 批量更新所有未读消息
  await db.collection('notifications')
    .where({
      userId,
      isRead: false
    })
    .update({
      data: {
        isRead: true,
        readAt: db.serverDate()
      }
    })
  
  return { success: true, message: '全部已标记为已读' }
}

/**
 * 获取未读消息数量
 */
async function getUnreadCount(openid) {
  // 获取用户信息
  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在', data: { count: 0 } }
  }
  const userId = userRes.data[0]._id
  
  const countRes = await db.collection('notifications')
    .where({
      userId,
      isRead: false
    })
    .count()
  
  // 按类型统计
  const typeCounts = await Promise.all([
    db.collection('notifications').where({ userId, isRead: false, type: 'system' }).count(),
    db.collection('notifications').where({ userId, isRead: false, type: 'activity' }).count(),
    db.collection('notifications').where({ userId, isRead: false, type: 'credit' }).count(),
    db.collection('notifications').where({ userId, isRead: false, type: 'consult' }).count()
  ])
  
  return {
    success: true,
    data: {
      total: countRes.total,
      system: typeCounts[0].total,
      activity: typeCounts[1].total,
      credit: typeCounts[2].total,
      consult: typeCounts[3].total
    }
  }
}

// ========== 辅助函数 ==========

function getTypeText(type) {
  const map = {
    system: '系统通知',
    activity: '活动通知',
    credit: '信用变动',
    consult: '咨询通知'
  }
  return map[type] || '通知'
}

function formatTimeAgo(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}月${day}日`
  }
}
