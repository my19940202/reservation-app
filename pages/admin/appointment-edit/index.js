const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showSuccess, showError } = require('../../../utils/index');
const { APPOINTMENT_STATUS_LABEL, CONSULT_TYPE_LABEL, ROLE } = require('../../../constants/enums');

Page({
  data: {
    id: '',
    detail: null,
    adminNote: '',
    loading: true,
    saving: false,
    statusLabel: APPOINTMENT_STATUS_LABEL,
    typeLabel: CONSULT_TYPE_LABEL,
    statusOptions: [
      { text: '待咨询', value: 'booked' },
      { text: '已完成', value: 'completed' },
      { text: '已取消', value: 'cancelled' },
    ],
    showStatusPicker: false,
    selectedStatus: '',
  },

  onLoad(options) {
    if (!requireRole([ROLE.ADMIN])) return;
    this.setData({ id: options.id || '' });
    this.loadDetail();
  },

  loadDetail() {
    callFunction('appointment', { action: 'detail', appointmentId: this.data.id })
      .then((res) => {
        const detail = res.detail || null;
        this.setData({
          detail,
          adminNote: (detail && detail.admin_note) || '',
          selectedStatus: detail ? detail.status : '',
          loading: false,
        });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  onNoteChange(e) {
    this.setData({ adminNote: e.detail });
  },

  openStatusPicker() {
    if (this.data.detail && this.data.detail.status === 'completed') {
      showError('已完成记录不可修改状态');
      return;
    }
    this.setData({ showStatusPicker: true });
  },

  closeStatusPicker() {
    this.setData({ showStatusPicker: false });
  },

  onStatusConfirm(e) {
    const picked = e.detail.value;
    const status = typeof picked === 'object' ? picked.value : picked;
    this.setData({ selectedStatus: status, showStatusPicker: false });
  },

  save() {
    const { id, selectedStatus, adminNote, detail, saving } = this.data;
    if (saving || !detail) return;
    this.setData({ saving: true });
    callFunction('admin', {
      action: 'updateAppointment',
      appointmentId: id,
      status: selectedStatus,
      adminNote,
    })
      .then(() => {
        showSuccess('保存成功');
        setTimeout(() => wx.navigateBack(), 1200);
      })
      .catch((err) => showError(err.message || '保存失败'))
      .finally(() => this.setData({ saving: false }));
  },
});
