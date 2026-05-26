const { callFunction } = require('../../utils/request');
const { requireRole } = require('../../utils/auth');
const { showSuccess, showError } = require('../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL, ROLE } = require('../../constants/enums');

Page({
  data: {
    list: [],
    loading: true,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
  },

  onLoad() {
    if (!requireRole([ROLE.TEACHER, ROLE.ADMIN])) return;
    this.loadList();
  },

  onShow() {
    if (this.data.list.length || !this.data.loading) {
      this.loadList();
    }
  },

  loadList() {
    this.setData({ loading: true });
    callFunction('appointment', { action: 'list', scope: 'teacher', status: 'booked' })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  verify(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认核销',
      content: '确认本次咨询已完成？核销后将扣减用户次数。',
      success: (res) => {
        if (!res.confirm) return;
        callFunction('verify', { action: 'confirm', appointmentId: id })
          .then(() => {
            showSuccess('核销成功');
            this.loadList();
            getApp().refreshSession();
          })
          .catch((err) => showError(err.message || '核销失败'));
      },
    });
  },
});
