const { callFunction, getDb } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showError } = require('../../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL, ROLE } = require('../../../constants/enums');
const COLLECTIONS = require('../../../constants/collections');

Page({
  data: {
    teachers: [],
    teacherId: '',
    list: [],
    loading: true,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
  },

  onLoad() {
    if (!requireRole([ROLE.ADMIN])) return;
    this.loadTeachers();
  },

  loadTeachers() {
    const db = getDb();
    db.collection(COLLECTIONS.TEACHERS)
      .where({ status: 'active' })
      .get()
      .then((res) => {
        const teachers = res.data || [];
        this.setData({
          teachers,
          teacherId: teachers[0] ? teachers[0]._id : '',
        });
        if (teachers[0]) {
          this.loadList();
        } else {
          this.setData({ loading: false });
        }
      });
  },

  onTeacherChange(e) {
    const index = e.detail.value;
    const teacher = this.data.teachers[index];
    if (teacher) {
      this.setData({ teacherId: teacher._id });
      this.loadList();
    }
  },

  loadList() {
    const { teacherId } = this.data;
    if (!teacherId) return;
    this.setData({ loading: true });
    callFunction('admin', { action: 'listByTeacher', teacherId })
      .then((res) => {
        this.setData({ list: res.list || [], loading: false });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/admin/appointment-edit/index?id=${id}` });
  },
});
