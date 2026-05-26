const { getDb } = require('../../utils/request');
const { showError } = require('../../utils/index');
const COLLECTIONS = require('../../constants/collections');

Page({
  data: {
    teachers: [],
    loading: true,
  },

  onLoad() {
    this.loadTeachers();
  },

  loadTeachers() {
    const db = getDb();
    if (!db) {
      showError('云开发未初始化');
      return;
    }
    db.collection(COLLECTIONS.TEACHERS)
      .where({ status: 'active' })
      .get()
      .then((res) => {
        this.setData({ teachers: res.data || [], loading: false });
      })
      .catch(() => {
        showError('加载咨询师失败');
        this.setData({ loading: false });
      });
  },

  goBooking(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/booking/index?teacherId=${id}&teacherName=${encodeURIComponent(name)}`,
    });
  },
});
