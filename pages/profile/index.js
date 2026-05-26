const { isAdmin, isTeacher } = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    userPackage: null,
    isTeacher: false,
    isAdmin: false,
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    const userPackage = wx.getStorageSync('userPackage');
    this.setData({
      userInfo,
      userPackage,
      isTeacher: isTeacher(),
      isAdmin: isAdmin(),
    });
    getApp().refreshSession();
  },

  goAppointments() {
    wx.navigateTo({ url: '/pages/appointments/index' });
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/index' });
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index/index' });
  },

  goAdminTeacherAppointments() {
    wx.navigateTo({ url: '/pages/admin/teacher-appointments/index' });
  },

  goAdminUserAppointments() {
    wx.navigateTo({ url: '/pages/admin/user-appointments/index' });
  },

  goAdminAppointmentEdit() {
    wx.showModal({
      title: '输入预约 ID',
      editable: true,
      placeholderText: 'appointments 记录的 _id',
      success: (res) => {
        if (!res.confirm) return;
        const id = (res.content || '').trim();
        if (!id) {
          wx.showToast({ title: '请输入预约 ID', icon: 'none' });
          return;
        }
        wx.navigateTo({ url: `/pages/admin/appointment-edit/index?id=${id}` });
      },
    });
  },
});
