const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showError } = require('../../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL, ROLE } = require('../../../constants/enums');

Page({
  data: {
    keyword: '',
    list: [],
    loading: false,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
  },

  onLoad() {
    if (!requireRole([ROLE.ADMIN])) return;
  },

  onSearch(e) {
    this.setData({ keyword: e.detail });
  },

  doSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) {
      showError('请输入用户姓名或手机号');
      return;
    }
    this.setData({ loading: true });
    callFunction('admin', { action: 'listByUser', keyword: keyword.trim() })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '搜索失败');
        this.setData({ loading: false });
      });
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/appointment-detail/index?id=${id}&readonly=1`,
    });
  },
});
