// 智汇银桥 - 简化角色选择页
const app = getApp()

Page({
  data: {
    phone: ''
  },

  onLoad(options) {
    if (options.phone) {
      this.setData({ phone: options.phone })
    }
  },

  // 选择角色 - 跳转到对应信息填写页
  selectRole(e) {
    const role = e.currentTarget.dataset.role
    const phone = this.data.phone

    if (!phone) {
      wx.showToast({ title: '手机号缺失，请重新登录', icon: 'none' })
      return
    }

    // 根据角色跳转到对应注册页
    const rolePages = {
      'parent': '/pages/register/parent/parent',
      'expert': '/pages/register/expert/expert',
      'volunteer': '/pages/register/volunteer/volunteer'
    }

    wx.navigateTo({
      url: `${rolePages[role]}?phone=${phone}`
    })
  }
})
