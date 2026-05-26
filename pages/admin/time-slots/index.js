const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showError, getDateStr } = require('../../../utils/index');
const {
  CONSULT_TYPE_LABEL,
  ROLE,
} = require('../../../constants/enums');

const SLOT_STATUS_LABEL = {
  open: '可预约',
  full: '已满',
  closed: '已关闭',
};

Page({
  data: {
    teacherId: '',
    teacherName: '',
    list: [],
    loading: true,
    typeLabel: CONSULT_TYPE_LABEL,
    slotStatusLabel: SLOT_STATUS_LABEL,
  },

  onLoad(options) {
    if (!requireRole([ROLE.ADMIN])) return;
    this.setData({
      teacherId: options.teacherId || '',
      teacherName: decodeURIComponent(options.teacherName || ''),
    });
    this.loadList();
  },

  onShow() {
    if (this.data.teacherId && !this.data.loading) {
      this.loadList();
    }
  },

  loadList() {
    const { teacherId } = this.data;
    if (!teacherId) return;
    this.setData({ loading: true });
    callFunction('admin', {
      action: 'listTimeSlots',
      teacherId,
      fromDate: getDateStr(),
    })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  goAdd() {
    const { teacherId, teacherName } = this.data;
    wx.navigateTo({
      url: `/pages/admin/time-slot-edit/index?teacherId=${teacherId}&teacherName=${encodeURIComponent(teacherName)}`,
    });
  },

  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    const { teacherId, teacherName } = this.data;
    wx.navigateTo({
      url: `/pages/admin/time-slot-edit/index?id=${id}&teacherId=${teacherId}&teacherName=${encodeURIComponent(teacherName)}`,
    });
  },
});
