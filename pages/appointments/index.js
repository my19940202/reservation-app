const { callFunction } = require('../../utils/request');
const { showError } = require('../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL } = require('../../constants/enums');

Page({
  data: {
    list: [],
    loading: true,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
    activeTab: 0,
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    this.setData({ loading: true });
    callFunction('appointment', { action: 'list', scope: 'self' })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/appointment-detail/index?id=${id}` });
  },
});
