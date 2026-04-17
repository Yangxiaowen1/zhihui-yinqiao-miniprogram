const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('开始初始化数据库...')
    const results = {}

    // 1. 初始化课程数据
    const courses = [
      {
        name: '传统剪纸入门',
        category: 'culture',
        description: '学习中国传统剪纸艺术',
        place: '社区活动室',
        teacherId: '',
        teacherName: '王老师',
        maxParticipants: 20,
        currentParticipants: 8,
        price: 0,
        status: 'available',
        avgRating: 4.8,
        totalRatings: 12,
        tags: ['非遗', '手工'],
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '书法启蒙课',
        category: 'culture',
        description: '从基础笔画开始学习书法',
        place: '社区书院',
        teacherId: '',
        teacherName: '李老师',
        maxParticipants: 15,
        currentParticipants: 10,
        price: 0,
        status: 'available',
        avgRating: 4.6,
        totalRatings: 8,
        tags: ['书法', '文化'],
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '智能手机培训',
        category: 'skill',
        description: '学习智能手机基本操作',
        place: '社区书院',
        teacherId: '',
        teacherName: '张老师',
        maxParticipants: 25,
        currentParticipants: 18,
        price: 0,
        status: 'available',
        avgRating: 4.9,
        totalRatings: 15,
        tags: ['科技', '实用'],
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '春季养生讲座',
        category: 'health',
        description: '春季养生与慢性病管理',
        place: '社区活动室',
        teacherId: '',
        teacherName: '王医生',
        maxParticipants: 30,
        currentParticipants: 20,
        price: 0,
        status: 'available',
        avgRating: 4.7,
        totalRatings: 10,
        tags: ['健康', '养生'],
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    // 检查是否已存在课程
    const existingCourses = await db.collection('courses').count()
    if (existingCourses.total === 0) {
      for (const course of courses) {
        await db.collection('courses').add({ data: course })
      }
      results.courses = courses.length
      console.log('课程初始化完成')
    } else {
      results.courses = 0
      console.log('课程数据已存在，跳过初始化')
    }

    // 2. 初始化活动数据
    const activities = [
      {
        name: '社区植树节',
        description: '共同参与社区绿化，共建美好家园',
        place: '社区公园',
        maxParticipants: 20,
        currentParticipants: 12,
        status: 'available',
        organizer: '社区居委会',
        activityType: 'volunteer',
        points: 5,
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '青银读书会',
        description: '青年与老人共读好书，分享人生智慧',
        place: '社区书院',
        maxParticipants: 16,
        currentParticipants: 8,
        status: 'available',
        organizer: '社区文化站',
        activityType: 'cultural',
        points: 3,
        startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '健康讲座',
        description: '春季养生专题讲座',
        place: '社区活动室',
        maxParticipants: 30,
        currentParticipants: 20,
        status: 'available',
        organizer: '社区卫生中心',
        activityType: 'lecture',
        points: 2,
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    const existingActivities = await db.collection('activities').count()
    if (existingActivities.total === 0) {
      for (const activity of activities) {
        await db.collection('activities').add({ data: activity })
      }
      results.activities = activities.length
      console.log('活动初始化完成')
    } else {
      results.activities = 0
      console.log('活动数据已存在，跳过初始化')
    }

    // 3. 初始化专家数据（银龄智库专家，非导师）
    const experts = [
      {
        name: '李教授',
        title: '法律顾问',
        field: '遗产、赡养、消费维权',
        description: '从业30年法律专家',
        rating: 4.9,
        consultCount: 156,
        status: 'available',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '王医生',
        title: '健康咨询',
        field: '慢病管理、用药指导',
        description: '三甲医院主任医师',
        rating: 4.8,
        consultCount: 203,
        status: 'available',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        name: '张老师',
        title: '心理辅导',
        field: '情绪、家庭关系',
        description: '国家二级心理咨询师',
        rating: 4.7,
        consultCount: 89,
        status: 'busy',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    const existingExperts = await db.collection('experts').count()
    if (existingExperts.total === 0) {
      for (const expert of experts) {
        await db.collection('experts').add({ data: expert })
      }
      results.experts = experts.length
      console.log('专家初始化完成')
    } else {
      results.experts = 0
      console.log('专家数据已存在，跳过初始化')
    }

    // 4. 创建示例银龄导师用户（role='expert'）
    const expertUsers = [
      {
        openid: 'demo_expert_openid_1',
        nickName: '银龄A',
        realName: '王建国',
        avatarUrl: '',
        phone: '13800138001',
        role: 'expert',
        identity: '银龄导师',
        community: '幸福社区',
        creditScore: 100,
        expertInfo: {
          expertise: '教育辅导',
          expertiseDetail: '小学语文教学、儿童心理辅导',
          availableTimes: { morning: true, afternoon: true, evening: false, weekend: true },
          starLevel: 3,
          totalHours: 52,
          totalStudents: 128,
          avgRating: 4.9,
          totalRatings: 28,
          certifications: ['教师资格证', '心理咨询师'],
          verified: true,
          intro: '退休小学语文教师，30年教学经验，擅长儿童心理辅导和语文启蒙教育。'
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_expert_openid_2',
        nickName: '银龄B',
        realName: '李文华',
        avatarUrl: '',
        phone: '13800138002',
        role: 'expert',
        identity: '银龄导师',
        community: '幸福社区',
        creditScore: 100,
        expertInfo: {
          expertise: '文化艺术',
          expertiseDetail: '书法、国画、传统剪纸',
          availableTimes: { morning: false, afternoon: true, evening: false, weekend: true },
          starLevel: 2,
          totalHours: 35,
          totalStudents: 56,
          avgRating: 4.6,
          totalRatings: 15,
          certifications: ['书法协会会员'],
          verified: true,
          intro: '书法爱好者，擅长楷书、行书，致力于传统文化传承。'
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_expert_openid_3',
        nickName: '银龄C',
        realName: '张秀英',
        avatarUrl: '',
        phone: '13800138003',
        role: 'expert',
        identity: '银龄导师',
        community: '阳光社区',
        creditScore: 98,
        expertInfo: {
          expertise: '健康养生',
          expertiseDetail: '中医养生、太极拳、八段锦',
          availableTimes: { morning: true, afternoon: false, evening: true, weekend: true },
          starLevel: 3,
          totalHours: 78,
          totalStudents: 200,
          avgRating: 4.8,
          totalRatings: 45,
          certifications: ['太极拳教练证'],
          verified: true,
          intro: '退休中医师，擅长养生保健，太极拳教学经验丰富。'
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_expert_openid_4',
        nickName: '银龄D',
        realName: '陈明德',
        avatarUrl: '',
        phone: '13800138004',
        role: 'expert',
        identity: '银龄导师',
        community: '和谐社区',
        creditScore: 95,
        expertInfo: {
          expertise: '生活技能',
          expertiseDetail: '智能手机教学、摄影、短视频制作',
          availableTimes: { morning: true, afternoon: true, evening: true, weekend: true },
          starLevel: 2,
          totalHours: 25,
          totalStudents: 40,
          avgRating: 4.5,
          totalRatings: 12,
          certifications: [],
          verified: true,
          intro: '退休IT工程师，热爱科技，擅长帮助老年人掌握智能设备。'
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_expert_openid_5',
        nickName: '银龄E',
        realName: '刘桂芳',
        avatarUrl: '',
        phone: '13800138005',
        role: 'expert',
        identity: '银龄导师',
        community: '幸福社区',
        creditScore: 100,
        expertInfo: {
          expertise: '家庭教育',
          expertiseDetail: '亲子沟通、青少年心理、家庭关系',
          availableTimes: { morning: false, afternoon: true, evening: true, weekend: false },
          starLevel: 3,
          totalHours: 60,
          totalStudents: 85,
          avgRating: 4.9,
          totalRatings: 32,
          certifications: ['家庭教育指导师'],
          verified: true,
          intro: '退休心理教师，专注家庭教育30年，帮助无数家庭改善亲子关系。'
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    // 检查是否已存在示例专家用户
    const existingExpertUsers = await db.collection('users').where({ role: 'expert' }).count()
    if (existingExpertUsers.total === 0) {
      for (const user of expertUsers) {
        await db.collection('users').add({ data: user })
      }
      results.expertUsers = expertUsers.length
      console.log('银龄导师用户初始化完成')
    } else {
      results.expertUsers = 0
      console.log('银龄导师用户已存在，跳过初始化')
    }

    // 5. 创建示例家长用户
    const parentUsers = [
      {
        openid: 'demo_parent_openid_1',
        nickName: '家长A',
        realName: '张三',
        avatarUrl: '',
        phone: '13900139001',
        role: 'parent',
        identity: '家长',
        community: '幸福社区',
        creditScore: 100,
        child: {
          name: '小明',
          age: 8,
          gender: '男',
          grade: '小学二年级',
          interests: ['绘画', '围棋']
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_parent_openid_2',
        nickName: '家长B',
        realName: '李四',
        avatarUrl: '',
        phone: '13900139002',
        role: 'parent',
        identity: '家长',
        community: '阳光社区',
        creditScore: 95,
        child: {
          name: '小红',
          age: 6,
          gender: '女',
          grade: '幼儿园大班',
          interests: ['舞蹈', '钢琴']
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    const existingParentUsers = await db.collection('users').where({ role: 'parent' }).count()
    if (existingParentUsers.total === 0) {
      for (const user of parentUsers) {
        await db.collection('users').add({ data: user })
      }
      results.parentUsers = parentUsers.length
      console.log('家长用户初始化完成')
    } else {
      results.parentUsers = 0
      console.log('家长用户已存在，跳过初始化')
    }

    // 6. 创建示例青年志愿者用户
    const volunteerUsers = [
      {
        openid: 'demo_volunteer_openid_1',
        nickName: '志愿者A',
        realName: '王小明',
        avatarUrl: '',
        phone: '13700137001',
        role: 'volunteer',
        identity: '青年志愿者',
        community: '幸福社区',
        creditScore: 100,
        volunteerInfo: {
          school: '北京大学',
          major: '社会工作',
          grade: '大三',
          totalHours: 48,
          totalActivities: 12,
          skills: ['陪伴老人', '课程辅导', '活动组织']
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      },
      {
        openid: 'demo_volunteer_openid_2',
        nickName: '志愿者B',
        realName: '李小红',
        avatarUrl: '',
        phone: '13700137002',
        role: 'volunteer',
        identity: '青年志愿者',
        community: '阳光社区',
        creditScore: 98,
        volunteerInfo: {
          school: '清华大学',
          major: '教育学',
          grade: '研一',
          totalHours: 72,
          totalActivities: 18,
          skills: ['课程教学', '心理疏导', '摄影记录']
        },
        silverMode: false,
        elderlySettings: { voiceEnabled: true, fontScale: 1.0, highContrast: true },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    const existingVolunteerUsers = await db.collection('users').where({ role: 'volunteer' }).count()
    if (existingVolunteerUsers.total === 0) {
      for (const user of volunteerUsers) {
        await db.collection('users').add({ data: user })
      }
      results.volunteerUsers = volunteerUsers.length
      console.log('青年志愿者用户初始化完成')
    } else {
      results.volunteerUsers = 0
      console.log('青年志愿者用户已存在，跳过初始化')
    }

    // 7. 创建示例订单（orders）
    const orders = [
      {
        orderNo: 'ORD' + Date.now() + '001',
        userId: 'demo_parent_1',
        expertId: 'demo_expert_1',
        orderType: 'course',
        targetId: '',
        courseName: '传统剪纸入门',
        scheduleTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        place: '社区活动室',
        amount: 0,
        status: 'confirmed',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    ]

    const existingOrders = await db.collection('orders').count()
    if (existingOrders.total === 0) {
      for (const order of orders) {
        await db.collection('orders').add({ data: order })
      }
      results.orders = orders.length
      console.log('订单初始化完成')
    } else {
      results.orders = 0
      console.log('订单数据已存在，跳过初始化')
    }

    // 6. 创建示例志愿时长记录（volunteer_hours）
    const volunteerHours = [
      {
        volunteerId: 'demo_volunteer_1',
        activityId: '',
        activityName: '青银读书会',
        hours: 3,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pairedWith: 'demo_elderly_1',
        verified: true,
        verifiedBy: 'admin',
        createTime: db.serverDate()
      }
    ]

    const existingVolunteerHours = await db.collection('volunteer_hours').count()
    if (existingVolunteerHours.total === 0) {
      for (const record of volunteerHours) {
        await db.collection('volunteer_hours').add({ data: record })
      }
      results.volunteer_hours = volunteerHours.length
      console.log('志愿时长记录初始化完成')
    } else {
      results.volunteer_hours = 0
      console.log('志愿时长记录已存在，跳过初始化')
    }

    // 7. 创建示例服务记录（service_records）
    const serviceRecords = [
      {
        expertId: 'demo_expert_1',
        userId: 'demo_parent_1',
        serviceType: 'course',
        targetId: '',
        serviceName: '传统剪纸入门',
        serviceTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        duration: 120,
        rating: 5,
        feedback: '王老师教得很好，孩子很喜欢！',
        creditChange: 2,
        createTime: db.serverDate()
      }
    ]

    const existingServiceRecords = await db.collection('service_records').count()
    if (existingServiceRecords.total === 0) {
      for (const record of serviceRecords) {
        await db.collection('service_records').add({ data: record })
      }
      results.service_records = serviceRecords.length
      console.log('服务记录初始化完成')
    } else {
      results.service_records = 0
      console.log('服务记录已存在，跳过初始化')
    }

    return {
      success: true,
      message: '数据库初始化完成',
      counts: results
    }
  } catch (err) {
    console.error('初始化失败:', err)
    return {
      success: false,
      errMsg: err.message
    }
  }
}
