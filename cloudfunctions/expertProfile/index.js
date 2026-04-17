const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 三星评级计算
function calculateStarLevel(profile) {
  const { totalHours, avgRating, totalStudents } = profile
  if (totalHours >= 50 && avgRating >= 4.8 && totalStudents >= 100) {
    return 3
  } else if (totalHours >= 20 && avgRating >= 4.5 && totalStudents >= 30) {
    return 2
  } else if (totalHours >= 1 && avgRating >= 4.0) {
    return 1
  }
  return 0
}

exports.main = async (event, context) => {
  const { action, data } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'getProfile':
      return await getProfile(OPENID)
    case 'getByUserId':
      return await getByUserId(data.userId)
    case 'updateProfile':
      return await updateProfile(OPENID, data)
    case 'updateRating':
      return await updateRating(data)
    case 'getOrders':
      return await getOrders(OPENID, data)
    case 'getStatistics':
      return await getStatistics(OPENID)
    case 'list':
      return await listExperts(data)
    case 'getTopExperts':
      return await getTopExperts(data)
    default:
      return { success: false, message: '未知操作' }
  }
}

// 获取当前导师档案
async function getProfile(openid) {
  try {
    // 先获取用户ID
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    // 获取导师档案
    const profileRes = await db.collection('expert_profiles').where({ userId: user._id }).get()
    if (profileRes.data.length === 0) {
      return { success: false, message: '导师档案不存在' }
    }

    return { success: true, data: profileRes.data[0] }
  } catch (err) {
    console.error('获取导师档案失败:', err)
    return { success: false, message: err.message }
  }
}

// 根据用户ID获取导师档案
async function getByUserId(userId) {
  try {
    const profileRes = await db.collection('expert_profiles').where({ userId }).get()
    if (profileRes.data.length === 0) {
      return { success: false, message: '导师档案不存在' }
    }
    return { success: true, data: profileRes.data[0] }
  } catch (err) {
    console.error('获取导师档案失败:', err)
    return { success: false, message: err.message }
  }
}

// 更新导师档案
async function updateProfile(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]

    // 检查档案是否存在
    const profileRes = await db.collection('expert_profiles').where({ userId: user._id }).get()
    
    const updateData = {
      ...data,
      updateTime: db.serverDate()
    }

    if (profileRes.data.length === 0) {
      // 创建新档案
      const newProfile = {
        userId: user._id,
        name: data.name || user.nickName,
        age: data.age,
        expertise: data.expertise,
        expertiseDetail: data.expertiseDetail || '',
        availableTimes: data.availableTimes || {},
        starLevel: 0,
        totalHours: 0,
        totalStudents: 0,
        avgRating: 5.0,
        totalEarnings: 0,
        monthEarnings: 0,
        certifications: [],
        verified: false,
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      await db.collection('expert_profiles').add({ data: newProfile })
      
      // 更新用户表
      await db.collection('users').doc(user._id).update({
        data: {
          expertInfo: {
            age: data.age,
            expertise: data.expertise,
            starLevel: 0
          },
          updateTime: db.serverDate()
        }
      })
      
      return { success: true, message: '档案创建成功' }
    } else {
      // 更新档案
      await db.collection('expert_profiles').doc(profileRes.data[0]._id).update({
        data: updateData
      })
      
      // 同步更新用户表
      await db.collection('users').doc(user._id).update({
        data: {
          expertInfo: {
            age: data.age,
            expertise: data.expertise,
            starLevel: profileRes.data[0].starLevel
          },
          updateTime: db.serverDate()
        }
      })
      
      return { success: true, message: '档案更新成功' }
    }
  } catch (err) {
    console.error('更新导师档案失败:', err)
    return { success: false, message: err.message }
  }
}

// 更新评级（内部调用，在服务完成后触发）
async function updateRating(data) {
  try {
    const { expertId, rating, hours } = data
    
    const profileRes = await db.collection('expert_profiles').where({ userId: expertId }).get()
    if (profileRes.data.length === 0) {
      return { success: false, message: '导师档案不存在' }
    }
    const profile = profileRes.data[0]
    
    // 计算新的平均值
    const newTotalRatings = (profile.totalRatings || 0) + 1
    const newAvgRating = ((profile.avgRating || 5) * (profile.totalRatings || 0) + rating) / newTotalRatings
    const newTotalHours = (profile.totalHours || 0) + (hours || 0)
    const newTotalStudents = (profile.totalStudents || 0) + 1
    
    // 计算新的星级
    const newStarLevel = calculateStarLevel({
      totalHours: newTotalHours,
      avgRating: newAvgRating,
      totalStudents: newTotalStudents
    })
    
    await db.collection('expert_profiles').doc(profile._id).update({
      data: {
        avgRating: Math.round(newAvgRating * 10) / 10,
        totalRatings: newTotalRatings,
        totalHours: newTotalHours,
        totalStudents: newTotalStudents,
        starLevel: newStarLevel,
        updateTime: db.serverDate()
      }
    })
    
    return { success: true, starLevel: newStarLevel }
  } catch (err) {
    console.error('更新评级失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取导师订单
async function getOrders(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]
    
    const { status, limit = 10, skip = 0 } = data || {}
    let query = db.collection('orders').where({ expertId: user._id })
    
    if (status) {
      query = query.where({ status })
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
    console.error('获取订单失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取导师统计数据
async function getStatistics(openid) {
  try {
    const userRes = await db.collection('users').where({ openid }).get()
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    const user = userRes.data[0]
    
    const profileRes = await db.collection('expert_profiles').where({ userId: user._id }).get()
    if (profileRes.data.length === 0) {
      return { success: false, message: '导师档案不存在' }
    }
    const profile = profileRes.data[0]
    
    // 获取待处理订单数
    const pendingOrders = await db.collection('orders')
      .where({ expertId: user._id, status: 'pending' })
      .count()
    
    // 获取本月收益
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEarningsRes = await db.collection('service_records')
      .where({
        expertId: user._id,
        serviceTime: _.gte(monthStart)
      })
      .field({ earnings: true })
      .get()
    
    const monthEarnings = monthEarningsRes.data.reduce((sum, r) => sum + (r.earnings || 0), 0)
    
    return {
      success: true,
      data: {
        starLevel: profile.starLevel,
        totalHours: profile.totalHours,
        totalStudents: profile.totalStudents,
        avgRating: profile.avgRating,
        totalEarnings: profile.totalEarnings,
        monthEarnings: monthEarnings,
        pendingOrders: pendingOrders.total,
        creditScore: user.creditScore || 100
      }
    }
  } catch (err) {
    console.error('获取统计数据失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取导师列表（家长端查看）
async function listExperts(data) {
  try {
    const { expertise, limit = 10, skip = 0 } = data || {}
    let query = db.collection('expert_profiles').where({ status: 'active', verified: true })
    
    if (expertise) {
      query = query.where({ expertise })
    }
    
    const countRes = await query.count()
    const listRes = await query
      .orderBy('starLevel', 'desc')
      .orderBy('avgRating', 'desc')
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
    console.error('获取导师列表失败:', err)
    return { success: false, message: err.message }
  }
}

// 获取顶尖导师（首页展示）
async function getTopExperts(data) {
  try {
    const { limit = 5 } = data || {}
    
    const res = await db.collection('expert_profiles')
      .where({ status: 'active', verified: true })
      .orderBy('starLevel', 'desc')
      .orderBy('avgRating', 'desc')
      .limit(limit)
      .get()
    
    return { success: true, data: res.data }
  } catch (err) {
    console.error('获取顶尖导师失败:', err)
    return { success: false, message: err.message }
  }
}
