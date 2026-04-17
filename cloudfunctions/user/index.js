const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * 用户云函数
 * action: login | getUserInfo | updateSettings | updateProfile | updateRole | getRoleInfo | addFavorite | removeFavorite | getFavorites
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      case 'login':
        return await handleLogin(openid, data)
      case 'getUserInfo':
        return await getUserInfo(openid)
      case 'updateSettings':
        return await updateSettings(openid, data)
      case 'updateProfile':
        return await updateProfile(openid, data)
      case 'updateRole':
        return await updateRole(openid, data)
      case 'getRoleInfo':
        return await getRoleInfo(openid)
      case 'addFavorite':
        return await addFavorite(openid, data)
      case 'removeFavorite':
        return await removeFavorite(openid, data)
      case 'getFavorites':
        return await getFavorites(openid, data)
      default:
        return { success: false, errMsg: '未知操作' }
    }
  } catch (err) {
    console.error('用户云函数错误:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 登录/注册
 * 自动判断是新用户还是老用户
 */
async function handleLogin(openid, data = {}) {
  const userCol = db.collection('users')
  const userRes = await userCol.where({ openid }).get()
  
  if (userRes.data.length > 0) {
    // 已注册用户，更新登录时间
    const user = userRes.data[0]
    await userCol.doc(user._id).update({
      data: { updateTime: db.serverDate() }
    })
    
    // 获取角色特定信息
    const roleData = await getRoleSpecificData(user)
    
    return { 
      success: true, 
      data: { ...user, ...roleData }, 
      isNewUser: false,
      message: '登录成功'
    }
  } else {
    // 新用户注册（此时还没有选择角色）
    const newUser = {
      openid,
      nickName: data.nickName || '新用户',
      avatarUrl: data.avatarUrl || '',
      phone: data.phone || '',
      realName: '',
      role: '', // 角色：parent/expert/volunteer
      identity: '未选择', // 身份标识：家长/银龄导师/青年志愿者
      community: '', // 所在社区
      creditScore: 100, // 初始信用分
      
      // 角色特定信息
      child: null, // 家长专属
      expertInfo: null, // 导师专属
      volunteerInfo: null, // 志愿者专属
      
      // 适老化设置
      silverMode: false,
      elderlySettings: {
        voiceEnabled: true,
        fontScale: 1.0,
        highContrast: true
      },
      
      status: 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const res = await userCol.add({ data: newUser })
    newUser._id = res._id
    
    return { 
      success: true, 
      data: newUser, 
      isNewUser: true,
      message: '注册成功'
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid) {
  const res = await db.collection('users').where({ openid }).get()
  
  if (res.data.length === 0) {
    return { success: false, errMsg: '用户不存在', data: null }
  }
  
  const userData = res.data[0]
  
  // 获取角色特定信息
  const roleData = await getRoleSpecificData(userData)
  
  // 获取未读消息数
  const notificationRes = await db.collection('notifications')
    .where({
      userId: userData._id,
      isRead: false
    })
    .count()
  
  userData.unreadCount = notificationRes.total
  
  return { success: true, data: { ...userData, ...roleData } }
}

/**
 * 获取角色特定数据
 */
async function getRoleSpecificData(user) {
  const roleData = {}

  switch (user.role) {
    case 'expert':
      // 导师信息直接从 expertInfo 字段获取
      if (user.expertInfo) {
        roleData.expertProfile = user.expertInfo
      }
      // 获取导师的服务统计
      const serviceRes = await db.collection('service_records')
        .where({ expertId: user._id })
        .get()
      if (serviceRes.data.length > 0) {
        roleData.totalServices = serviceRes.data.length
        roleData.totalHours = serviceRes.data.reduce((sum, r) => sum + (r.duration || 0), 0) / 60
      }
      break

    case 'volunteer':
      // 获取志愿时长统计
      const hoursRes = await db.collection('volunteer_hours')
        .where({ volunteerId: user._id })
        .get()
      if (hoursRes.data.length > 0) {
        roleData.totalHours = hoursRes.data.reduce((sum, r) => sum + r.hours, 0)
        roleData.totalActivities = hoursRes.data.length
      }
      break

    case 'parent':
      // 获取子女信息
      const childrenRes = await db.collection('children')
        .where({ parentId: user._id })
        .get()
      if (childrenRes.data.length > 0) {
        roleData.children = childrenRes.data
      }
      break
  }

  return roleData
}

/**
 * 更新适老化设置（银龄模式等）
 */
async function updateSettings(openid, data) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  
  const updateData = {
    updateTime: db.serverDate()
  }
  
  if (data.silverMode !== undefined) {
    updateData.silverMode = data.silverMode
  }
  
  if (data.elderlySettings) {
    updateData.elderlySettings = data.elderlySettings
  }
  
  await db.collection('users').doc(userRes.data[0]._id).update({
    data: updateData
  })
  
  return { success: true, message: '设置已更新' }
}

/**
 * 更新用户资料
 */
async function updateProfile(openid, data) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  
  const user = userRes.data[0]
  
  // 允许更新的字段
  const allowedFields = ['nickName', 'avatarUrl', 'phone', 'realName', 'community']
  const updateData = { updateTime: db.serverDate() }
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field]
    }
  })
  
  await db.collection('users').doc(user._id).update({
    data: updateData
  })
  
  // 更新角色特定信息
  if (user.role === 'parent' && data.child) {
    await updateParentInfo(user._id, data.child)
  } else if (user.role === 'expert' && data.expertInfo) {
    await updateExpertInfo(user._id, data.expertInfo)
  } else if (user.role === 'volunteer' && data.volunteerInfo) {
    await updateVolunteerInfo(user._id, data.volunteerInfo)
  }
  
  return { success: true, message: '资料已更新' }
}

/**
 * 更新用户角色（注册时选择角色后调用）
 */
async function updateRole(openid, data) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  
  const user = userRes.data[0]
  const { role, ...roleData } = data
  
  // 验证角色
  const validRoles = ['parent', 'expert', 'volunteer']
  if (!validRoles.includes(role)) {
    return { success: false, errMsg: '无效的角色类型' }
  }
  
  // 身份标识映射
  const identityMap = {
    parent: '家长',
    expert: '银龄导师',
    volunteer: '青年志愿者'
  }
  
  // 更新用户角色和身份标识
  const updateData = {
    role,
    identity: identityMap[role],
    nickName: roleData.name || roleData.guardianName || user.nickName,
    community: roleData.community || user.community,
    updateTime: db.serverDate()
  }
  
  // 根据角色添加特定信息
  if (role === 'expert') {
    updateData.expertInfo = {
      expertise: roleData.expertise || '',
      expertiseDetail: roleData.expertiseDetail || '',
      availableTimes: roleData.availableTimes || {},
      starLevel: 0,
      totalHours: 0,
      totalStudents: 0,
      avgRating: 5.0,
      totalRatings: 0,
      certifications: roleData.certifications || [],
      verified: false,
      intro: roleData.intro || ''
    }
  } else if (role === 'volunteer') {
    updateData.volunteerInfo = {
      school: roleData.school || '',
      major: roleData.major || '',
      grade: roleData.grade || '',
      totalHours: 0,
      totalActivities: 0,
      skills: roleData.skills || []
    }
  } else if (role === 'parent') {
    updateData.child = {
      name: roleData.childName || '',
      age: roleData.childAge || 0,
      gender: roleData.childGender || '',
      grade: roleData.childGrade || '',
      interests: roleData.childInterests || []
    }
  }
  
  await db.collection('users').doc(user._id).update({
    data: updateData
  })
  
  return { success: true, message: '角色设置成功' }
}

/**
 * 创建导师档案
 */
async function createExpertProfile(userId, data) {
  const existingProfile = await db.collection('expert_profiles')
    .where({ userId })
    .get()
  
  if (existingProfile.data.length === 0) {
    await db.collection('expert_profiles').add({
      data: {
        userId,
        name: data.name || '',
        age: data.age || 60,
        expertise: data.expertise || '',
        expertiseDetail: data.expertiseDetail || '',
        availableTimes: data.availableTimes || {},
        starLevel: 0,
        totalHours: 0,
        totalStudents: 0,
        avgRating: 5.0,
        totalRatings: 0,
        totalEarnings: 0,
        monthEarnings: 0,
        certifications: [],
        verified: false,
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    // 更新用户表的专家信息
    await db.collection('users').doc(userId).update({
      data: {
        expertInfo: {
          age: data.age,
          expertise: data.expertise,
          starLevel: 0
        },
        updateTime: db.serverDate()
      }
    })
  }
}

/**
 * 创建子女记录
 */
async function createChildRecord(userId, data) {
  if (data.child) {
    await db.collection('children').add({
      data: {
        parentId: userId,
        name: data.child.name || '',
        age: data.child.age || 0,
        gender: data.child.gender || '',
        interests: [],
        courses: [],
        createTime: db.serverDate()
      }
    })
    
    // 更新用户表的子女信息
    await db.collection('users').doc(userId).update({
      data: {
        child: {
          name: data.child.name,
          age: data.child.age,
          gender: data.child.gender
        },
        updateTime: db.serverDate()
      }
    })
  }
}

/**
 * 创建志愿者信息
 */
async function createVolunteerInfo(userId, data) {
  await db.collection('users').doc(userId).update({
    data: {
      volunteerInfo: {
        school: data.school || '',
        totalHours: 0
      },
      updateTime: db.serverDate()
    }
  })
}

/**
 * 获取角色信息
 */
async function getRoleInfo(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  
  const user = userRes.data[0]
  const roleInfo = {
    role: user.role,
    creditScore: user.creditScore
  }
  
  switch (user.role) {
    case 'parent':
      roleInfo.child = user.child
      break
    case 'expert':
      const profileRes = await db.collection('expert_profiles')
        .where({ userId: user._id })
        .get()
      if (profileRes.data.length > 0) {
        roleInfo.expertProfile = profileRes.data[0]
      }
      break
    case 'volunteer':
      roleInfo.volunteerInfo = user.volunteerInfo
      break
  }
  
  return { success: true, data: roleInfo }
}

/**
 * 更新家长信息
 */
async function updateParentInfo(userId, childData) {
  await db.collection('users').doc(userId).update({
    data: {
      child: childData,
      updateTime: db.serverDate()
    }
  })
}

/**
 * 更新导师信息
 */
async function updateExpertInfo(userId, expertData) {
  await db.collection('users').doc(userId).update({
    data: {
      expertInfo: expertData,
      updateTime: db.serverDate()
    }
  })
  
  // 同步更新导师档案
  const profileRes = await db.collection('expert_profiles')
    .where({ userId })
    .get()
  
  if (profileRes.data.length > 0) {
    await db.collection('expert_profiles').doc(profileRes.data[0]._id).update({
      data: {
        ...expertData,
        updateTime: db.serverDate()
      }
    })
  }
}

/**
 * 更新志愿者信息
 */
async function updateVolunteerInfo(userId, volunteerData) {
  await db.collection('users').doc(userId).update({
    data: {
      volunteerInfo: {
        ...volunteerData,
        totalHours: volunteerData.totalHours || 0
      },
      updateTime: db.serverDate()
    }
  })
}

/**
 * 添加收藏
 */
async function addFavorite(openid, data) {
  const { type, targetId } = data
  if (!type || !targetId) {
    return { success: false, errMsg: '参数不完整' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  // 添加到 favorites 集合
  const existRes = await db.collection('favorites').where({
    userId,
    type,
    targetId
  }).get()

  if (existRes.data.length > 0) {
    return { success: true, message: '已收藏' }
  }

  await db.collection('favorites').add({
    data: {
      userId,
      type,
      targetId,
      createdAt: db.serverDate()
    }
  })

  return { success: true, message: '收藏成功' }
}

/**
 * 取消收藏
 */
async function removeFavorite(openid, data) {
  const { type, targetId } = data
  if (!type || !targetId) {
    return { success: false, errMsg: '参数不完整' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  const existRes = await db.collection('favorites').where({
    userId,
    type,
    targetId
  }).get()

  if (existRes.data.length > 0) {
    await db.collection('favorites').doc(existRes.data[0]._id).remove()
  }

  return { success: true, message: '已取消收藏' }
}

/**
 * 获取收藏列表
 */
async function getFavorites(openid, data) {
  const { type } = data

  if (!openid) {
    return { success: false, errMsg: '未获取到用户身份' }
  }

  const userRes = await db.collection('users').where({ openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userId = userRes.data[0]._id

  const conditions = { userId }
  if (type) {
    conditions.type = type
  }

  const res = await db.collection('favorites').where(conditions).get()
  const list = res.data.map(item => item.targetId)

  return { success: true, data: { list } }
}
