const { getDb, callFunction } = require('../../utils/request');
const { showSuccess, showError, getDateStr } = require('../../utils/index');
const COLLECTIONS = require('../../constants/collections');

Page({
  data: {
    teacherId: '',
    teacherName: '',
    consultType: 'oneToOne',
    typeOptions: [
      { text: '一对一', value: 'oneToOne' },
      { text: '一对多', value: 'group' },
    ],
    slots: [],
    selectedSlotId: '',
    loading: true,
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      teacherId: options.teacherId || '',
      teacherName: decodeURIComponent(options.teacherName || ''),
    });
    this.loadSlots();
  },

  onTypeChange(e) {
    const type = e.detail.name || (e.detail.index === 0 ? 'oneToOne' : 'group');
    this.setData({ consultType: type });
    this.loadSlots();
  },

  loadSlots() {
    const { teacherId, consultType } = this.data;
    const db = getDb();
    if (!db || !teacherId) return;
    const today = getDateStr();
    this.setData({ loading: true });
    db.collection(COLLECTIONS.TIME_SLOTS)
      .where({
        teacher_id: teacherId,
        type: consultType,
        status: 'open',
        date: db.command.gte(today),
      })
      .orderBy('date', 'asc')
      .orderBy('start_time', 'asc')
      .get()
      .then((res) => {
        this.setData({ slots: res.data || [], loading: false, selectedSlotId: '' });
      })
      .catch(() => {
        showError('加载时段失败');
        this.setData({ loading: false });
      });
  },

  selectSlot(e) {
    this.setData({ selectedSlotId: e.currentTarget.dataset.id });
  },

  submitBooking() {
    const { selectedSlotId, consultType, submitting } = this.data;
    if (!selectedSlotId || submitting) return;
    this.setData({ submitting: true });
    callFunction('appointment', {
      action: 'create',
      slotId: selectedSlotId,
      type: consultType,
    })
      .then(() => {
        showSuccess('预约成功');
        getApp().refreshSession();
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        showError(err.message || '预约失败');
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },
});
