/**
 * 公共工具函数模块
 */

/**
 * 格式化日期
 * @param {Date|string} date 日期对象或时间戳
 * @param {string} format 格式化模板
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
  const d = new Date(date)
  const map = {
    YYYY: d.getFullYear(),
    MM: (d.getMonth() + 1).toString().padStart(2, '0'),
    DD: d.getDate().toString().padStart(2, '0'),
    HH: d.getHours().toString().padStart(2, '0'),
    mm: d.getMinutes().toString().padStart(2, '0'),
    ss: d.getSeconds().toString().padStart(2, '0')
  }
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => map[match])
}

/**
 * 生成友好的时间显示
 * @param {Date|string} date 
 * @returns {string}
 */
function formatFriendlyDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = d - now
  const dayDiff = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  if (dayDiff < 0) {
    return '已结束'
  } else if (dayDiff === 0) {
    return '今天'
  } else if (dayDiff === 1) {
    return '明天'
  } else if (dayDiff <= 7) {
    return `${dayDiff}天后`
  } else {
    return formatDate(date, 'MM月DD日')
  }
}

/**
 * 检查时间段是否可用（未过期）
 * @param {Date|string} startTime 
 * @returns {boolean}
 */
function isSlotAvailable(startTime) {
  return new Date(startTime) > new Date()
}

/**
 * 计算距离天数
 * @param {Date|string} date 
 * @returns {number}
 */
function daysUntil(date) {
  const now = new Date()
  const target = new Date(date)
  const diff = target - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * 统一响应格式
 * @param {boolean} success 
 * @param {*} data 
 * @param {string} errMsg 
 * @returns {object}
 */
function response(success, data = null, errMsg = '') {
  return { success, data, errMsg }
}

/**
 * 成功响应
 * @param {*} data 
 * @returns {object}
 */
function success(data = null) {
  return response(true, data)
}

/**
 * 失败响应
 * @param {string} errMsg 
 * @returns {object}
 */
function fail(errMsg) {
  return response(false, null, errMsg)
}

/**
 * 获取状态文本
 * @param {string} status 
 * @param {string} type course/expert/activity
 * @returns {object} { text, className }
 */
function getStatusInfo(status, type = 'course') {
  const statusMap = {
    course: {
      available: { text: '可预约', className: 'status-available' },
      full: { text: '已满员', className: 'status-full' },
      ended: { text: '已结束', className: 'status-ended' },
      cancelled: { text: '已取消', className: 'status-cancelled' }
    },
    expert: {
      available: { text: '可预约', className: 'status-available' },
      busy: { text: '忙碌中', className: 'status-busy' },
      offline: { text: '离线', className: 'status-offline' }
    },
    activity: {
      available: { text: '可报名', className: 'status-available' },
      full: { text: '已满员', className: 'status-full' },
      ended: { text: '已结束', className: 'status-ended' },
      cancelled: { text: '已取消', className: 'status-cancelled' }
    },
    registration: {
      registered: { text: '已报名', className: 'status-registered' },
      attended: { text: '已签到', className: 'status-attended' },
      cancelled: { text: '已取消', className: 'status-cancelled' },
      completed: { text: '已完成', className: 'status-completed' }
    }
  }
  
  return statusMap[type]?.[status] || { text: status, className: '' }
}

module.exports = {
  formatDate,
  formatFriendlyDate,
  isSlotAvailable,
  daysUntil,
  response,
  success,
  fail,
  getStatusInfo
}
