const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showError } = require('../../../utils/index');
const { CONSULT_TYPE_LABEL, ROLE } = require('../../../constants/enums');

Page({
  data: {
    keyword: '',
    list: [],
    loading: true,
    typeLabel: CONSULT_TYPE_LABEL,
  },

  onLoad() {
    if (!requireRole([ROLE.ADMIN])) return;
    this.loadList();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadList();
    }
  },

  onSearchChange(e) {
    this.setData({ keyword: e.detail || '' });
  },

  onSearch() {
    this.loadList();
  },

  loadList() {
    const { keyword } = this.data;
    this.setData({ loading: true });
    callFunction('admin', { action: 'listTeachers', keyword: keyword.trim() })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/admin/teacher-edit/index' });
  },

  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/admin/teacher-edit/index?id=${id}` });
  },
});
