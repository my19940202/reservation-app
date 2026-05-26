const { showError } = require('../../utils/index');
const COLLECTIONS = require('../../constants/collections');
const BANNERS = require('../../constants/banners');

const app = getApp();

Page({
  data: {
    banners: BANNERS,
    teachers: [],
    loading: true,
  },


  onLoad() {
    this.globalData = app.globalData;
  },

  onShow() {
    this.loadTeachers();
    if (app && app.refreshSession) {
      app.refreshSession();
    }
  },

  async loadTeachers() {
    await app.getInitPromise();
    const db = app.globalData && app.globalData.db;
    if (!db) {
      showError('云开发未初始化');
      this.setData({ loading: false });
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

  onShareAppMessage() {
    return {
      title: '心理咨询预约 - 选择咨询师在线预约',
      path: '/pages/home/index',
    };
  },

  onShareTimeline() {
    return {
      title: '心理咨询预约 - 选择咨询师在线预约',
      query: '',
    };
  },
});
