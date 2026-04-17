const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 生成订单编号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD${year}${month}${day}${random}`
}

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'create':
      return await createOrder(OPENID, data)
    case 'list':
      return await listOrders(OPENID, data)
    case 'detail':
      return await getOrderDetail(data)
    case 'update':
      return await updateOrder(OPENID, data)
    case 'confirm':
      return await confirmOrder(OPENID, data)
    case 'cancel':
      return await cancelOrder(OPENID, data)
    case 'complete':
      return await completeOrder(OPENID, data)
    case 'evaluate':
      return await evaluateOrder(OPENID, data)
    case 'getStatistics':
      return await getStatistics(OPENID)
    case 'getPendingOrders':
      return await getPendingOrders(OPENID)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 创建订单
async function createOrder(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    if (user.role !== 'parent') {
      return { success: false, message: '仅家长可以报名课程' }
    }

    const { orderType, targetId, courseName, scheduleTime, place, amount, expertId } = data

    const order = {
      orderNo: generateOrderNo(),
      userId: user._id,
      userName: user.nickName || user.guardianName || '用户',
      userPhone: user.phone,
      expertId: expertId || '',
      orderType,
      targetId,
      courseName,
      scheduleTime: new Date(scheduleTime),
      place,
      amount: amount || 0,
      status: 'pending',
      rating: 0,
      feedback: '',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const res = await db.collection('orders').add({ data: order })

    // 发送通知给导师（如果有）
    if (expertId) {
      await db.collection('notifications').add({
        data: {
          userId: expertId,
          type: 'order',
          title: '新订单通知',
          content: `${user.nickName || '家长'}报名了您的课程「${courseName}」`,
          data: { orderId: res._id },
          isRead: false,
          createTime: db.serverDate()
        }
      })
    }

    // 增加课程报名人数
    if (orderType === 'course' && targetId) {
      await db.collection('courses').doc(targetId).update({
        data: {
          currentParticipants: _.inc(1),
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true, data: { orderId: res._id, orderNo: order.orderNo } }
  } catch (err) {
    console.error('创建订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取订单列表
async function listOrders(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const { status, orderType, limit = 10, skip = 0 } = data || {}

    let query
    if (user.role === 'parent') {
      query = db.collection('orders').where({ userId: user._id })
    } else if (user.role === 'expert') {
      query = db.collection('orders').where({ expertId: user._id })
    } else {
      return { success: false, message: '无权限查看订单' }
    }

    if (status) {
      query = query.where({ status })
    }
    if (orderType) {
      query = query.where({ orderType })
    }

    const countRes = await query.count()
    const listRes = await query.orderBy('createTime', 'desc').skip(skip).limit(limit).get()

    return {
      success: true,
      data: {
        list: listRes.data,
        total: countRes.total
      }
    }
  } catch (err) {
    console.error('获取订单列表失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取订单详情
async function getOrderDetail(data) {
  try {
    const { orderId } = data
    const res = await db.collection('orders').doc(orderId).get()
    return { success: true, data: res.data }
  } catch (err) {
    console.error('获取订单详情失败:', err)
    return { success: false, message: err.message }
  }
}

// 更新订单
async function updateOrder(openid, data) {
  try {
    const { orderId, ...updateData } = data
    updateData.updateTime = db.serverDate()

    await db.collection('orders').doc(orderId).update({
      data: updateData
    })

    return { success: true, message: '更新成功' }
  } catch (err) {
    console.error('更新订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 确认订单（导师确认）
async function confirmOrder(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const { orderId } = data
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'confirmed',
        updateTime: db.serverDate()
      }
    })

    // 通知家长
    const orderRes = await db.collection('orders').doc(orderId).get()
    await db.collection('notifications').add({
      data: {
        userId: orderRes.data.userId,
        type: 'order',
        title: '订单已确认',
        content: `您的课程「${orderRes.data.courseName}」已被导师确认`,
        data: { orderId },
        isRead: false,
        createTime: db.serverDate()
      }
    })

    return { success: true, message: '确认成功' }
  } catch (err) {
    console.error('确认订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 取消订单
async function cancelOrder(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const { orderId, reason } = data
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        cancelReason: reason,
        updateTime: db.serverDate()
      }
    })

    // 减少课程报名人数
    if (order.orderType === 'course' && order.targetId) {
      await db.collection('courses').doc(order.targetId).update({
        data: {
          currentParticipants: _.inc(-1),
          updateTime: db.serverDate()
        }
      })
    }

    // 通知对方
    const notifyUserId = user.role === 'parent' ? order.expertId : order.userId
    if (notifyUserId) {
      await db.collection('notifications').add({
        data: {
          userId: notifyUserId,
          type: 'order',
          title: '订单已取消',
          content: `课程「${order.courseName}」已被取消`,
          data: { orderId },
          isRead: false,
          createTime: db.serverDate()
        }
      })
    }

    return { success: true, message: '取消成功' }
  } catch (err) {
    console.error('取消订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 完成订单
async function completeOrder(openid, data) {
  try {
    const { orderId } = data
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        updateTime: db.serverDate()
      }
    })

    // 创建服务记录
    await db.collection('service_records').add({
      data: {
        expertId: order.expertId,
        userId: order.userId,
        serviceType: order.orderType,
        targetId: order.targetId,
        serviceName: order.courseName,
        serviceTime: order.scheduleTime || new Date(),
        duration: 120,
        creditChange: 2,
        createTime: db.serverDate()
      }
    })

    // 更新导师统计数据（触发评级计算）
    if (order.expertId) {
      const profileRes = await db.collection('expert_profiles').where({ userId: order.expertId }).get()
      if (profileRes.data.length > 0) {
        const profile = profileRes.data[0]
        const newTotalStudents = (profile.totalStudents || 0) + 1
        const newTotalHours = (profile.totalHours || 0) + 2

        // 简单评级计算
        let newStarLevel = profile.starLevel
        if (newTotalHours >= 50 && profile.avgRating >= 4.8 && newTotalStudents >= 100) {
          newStarLevel = 3
        } else if (newTotalHours >= 20 && profile.avgRating >= 4.5 && newTotalStudents >= 30) {
          newStarLevel = 2
        } else if (newTotalHours >= 1 && profile.avgRating >= 4.0) {
          newStarLevel = 1
        }

        await db.collection('expert_profiles').doc(profile._id).update({
          data: {
            totalStudents: newTotalStudents,
            totalHours: newTotalHours,
            starLevel: newStarLevel,
            totalEarnings: _.inc(order.amount || 0),
            updateTime: db.serverDate()
          }
        })
      }
    }

    return { success: true, message: '订单完成' }
  } catch (err) {
    console.error('完成订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 评价订单
async function evaluateOrder(openid, data) {
  try {
    const { orderId, rating, feedback } = data

    await db.collection('orders').doc(orderId).update({
      data: {
        rating,
        feedback,
        feedbackTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    // 更新导师评分
    const orderRes = await db.collection('orders').doc(orderId).get()
    if (orderRes.data.expertId) {
      const profileRes = await db.collection('expert_profiles').where({ userId: orderRes.data.expertId }).get()
      if (profileRes.data.length > 0) {
        const profile = profileRes.data[0]
        const newTotalRatings = (profile.totalRatings || 0) + 1
        const newAvgRating = ((profile.avgRating || 5) * (profile.totalRatings || 0) + rating) / newTotalRatings

        await db.collection('expert_profiles').doc(profile._id).update({
          data: {
            avgRating: Math.round(newAvgRating * 10) / 10,
            totalRatings: newTotalRatings,
            updateTime: db.serverDate()
          }
        })
      }
    }

    return { success: true, message: '评价成功' }
  } catch (err) {
    console.error('评价订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取订单统计
async function getStatistics(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    const role = user.role
    let query
    if (role === 'parent') {
      query = db.collection('orders').where({ userId: user._id })
    } else if (role === 'expert') {
      query = db.collection('orders').where({ expertId: user._id })
    } else {
      return { success: false, message: '无权限' }
    }

    const [total, pending, confirmed, completed, cancelled] = await Promise.all([
      query.count(),
      db.collection('orders').where(role === 'parent' ? { userId: user._id, status: 'pending' } : { expertId: user._id, status: 'pending' }).count(),
      db.collection('orders').where(role === 'parent' ? { userId: user._id, status: 'confirmed' } : { expertId: user._id, status: 'confirmed' }).count(),
      db.collection('orders').where(role === 'parent' ? { userId: user._id, status: 'completed' } : { expertId: user._id, status: 'completed' }).count(),
      db.collection('orders').where(role === 'parent' ? { userId: user._id, status: 'cancelled' } : { expertId: user._id, status: 'cancelled' }).count()
    ])

    return {
      success: true,
      data: {
        total: total.total,
        pending: pending.total,
        confirmed: confirmed.total,
        completed: completed.total,
        cancelled: cancelled.total
      }
    }
  } catch (err) {
    console.error('获取统计失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取待处理订单（导师首页）
async function getPendingOrders(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    if (user.role !== 'expert') {
      return { success: false, message: '仅导师可查看' }
    }

    const res = await db.collection('orders')
      .where({ expertId: user._id, status: _.in(['pending', 'confirmed']) })
      .orderBy('createTime', 'desc')
      .limit(10)
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    console.error('获取待处理订单失败:', err)
    return { success: false, message: err.message }
  }
}
