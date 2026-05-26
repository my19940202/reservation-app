const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showError } = require('../../../utils/index');
const { ROLE } = require('../../../constants/enums');

Page({
  data: {
    stats: {
      userCount: 0,
      teacherCount: 0,
      appointmentTotal: 0,
      bookedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    },
    loading: true,
  },

  onLoad() {
    if (!requireRole([ROLE.ADMIN])) return;
    this.loadStats();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadStats();
    }
  },

  loadStats() {
    this.setData({ loading: true });
    callFunction('admin', { action: 'getStats' })
      .then((res) => {
        this.setData({ stats: res.stats || {}, loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载统计失败');
        this.setData({ loading: false });
      });
  },

  goTeacherAppointments() {
    wx.navigateTo({ url: '/pages/admin/teacher-appointments/index' });
  },

  goUserAppointments() {
    wx.navigateTo({ url: '/pages/admin/user-appointments/index' });
  },

  goTeacherManagement() {
    wx.navigateTo({ url: '/pages/admin/teachers/index' });
  },

  goTimeSlots() {
    wx.navigateTo({ url: '/pages/admin/teachers/index?mode=slots' });
  },
});
