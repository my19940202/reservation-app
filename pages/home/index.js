const { callFunction } = require('../../utils/request');

Page({
  data: {
    userPackage: null,
    loading: true,
  },

  onShow() {
    this.loadPackage();
  },

  loadPackage() {
    const userPackage = wx.getStorageSync('userPackage');
    this.setData({ userPackage, loading: false });
    const app = getApp();
    if (app && app.refreshSession) {
      app.refreshSession();
    }
  },

  goTeachers() {
    wx.navigateTo({ url: '/pages/teachers/index' });
  },

  goAppointments() {
    wx.navigateTo({ url: '/pages/appointments/index' });
  },
});
