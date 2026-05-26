const { callFunction } = require('../../utils/request');
const { showSuccess, showError } = require('../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL } = require('../../constants/enums');

Page({
  data: {
    id: '',
    detail: null,
    readonly: false,
    loading: true,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
  },

  onLoad(options) {
    this.setData({
      id: options.id || '',
      readonly: options.readonly === '1',
    });
    this.loadDetail();
  },

  loadDetail() {
    callFunction('appointment', {
      action: 'detail',
      appointmentId: this.data.id,
    })
      .then((res) => {
        this.setData({ detail: res.detail || null, loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  cancelAppointment() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这次预约吗？',
      success: (res) => {
        if (!res.confirm) return;
        callFunction('appointment', {
          action: 'cancel',
          appointmentId: this.data.id,
        })
          .then(() => {
            showSuccess('已取消');
            getApp().refreshSession();
            setTimeout(() => wx.navigateBack(), 1500);
          })
          .catch((err) => showError(err.message || '取消失败'));
      },
    });
  },
});
