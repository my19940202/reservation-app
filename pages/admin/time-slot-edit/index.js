const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showSuccess, showError, getDateStr } = require('../../../utils/index');
const { ROLE } = require('../../../constants/enums');

Page({
  data: {
    id: '',
    teacherId: '',
    teacherName: '',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    consultType: 'oneToOne',
    capacity: '1',
    status: 'open',
    bookedCount: 0,
    locked: false,
    showCalendar: false,
    minDate: 0,
    loading: false,
    submitting: false,
    deleting: false,
  },

  onLoad(options) {
    if (!requireRole([ROLE.ADMIN])) return;
    const id = options.id || '';
    const teacherId = options.teacherId || '';
    const teacherName = decodeURIComponent(options.teacherName || '');
    const today = getDateStr();
    this.setData({
      id,
      teacherId,
      teacherName,
      minDate: new Date(`${today}T00:00:00`).getTime(),
    });
    if (id) {
      this.loadDetail(id);
    }
  },

  loadDetail(id) {
    this.setData({ loading: true });
    callFunction('admin', { action: 'getTimeSlotById', slotId: id })
      .then((res) => {
        const slot = res.slot || {};
        const bookedCount = slot.booked_count || 0;
        this.setData({
          teacherId: slot.teacher_id || this.data.teacherId,
          date: slot.date || '',
          startTime: slot.start_time || '10:00',
          endTime: slot.end_time || '11:00',
          consultType: slot.type || 'oneToOne',
          capacity: String(slot.capacity || 1),
          status: slot.status || 'open',
          bookedCount,
          locked: bookedCount > 0,
          loading: false,
        });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  openCalendar() {
    if (this.data.locked) return;
    this.setData({ showCalendar: true });
  },

  closeCalendar() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    const date = getDateStr(e.detail);
    this.setData({ date, showCalendar: false });
  },

  onStartTimeChange(e) {
    if (this.data.locked) return;
    this.setData({ startTime: e.detail.value });
  },

  onEndTimeChange(e) {
    if (this.data.locked) return;
    this.setData({ endTime: e.detail.value });
  },

  onTypeChange(e) {
    if (this.data.locked) return;
    const type = e.detail.name || (e.detail.index === 0 ? 'oneToOne' : 'group');
    this.setData({
      consultType: type,
      capacity: type === 'oneToOne' ? '1' : this.data.capacity === '1' ? '10' : this.data.capacity,
    });
  },

  onCapacityChange(e) {
    this.setData({ capacity: String(e.detail || '').trim() });
  },

  onStatusChange(e) {
    const checked = e.detail;
    if (checked) {
      const cap = Number(this.data.capacity) || 1;
      if (this.data.bookedCount >= cap) {
        showError('名额已满，请先增加名额后再开放');
        return;
      }
      this.setData({ status: 'open' });
    } else {
      this.setData({ status: 'closed' });
    }
  },

  onSubmit() {
    const {
      id,
      teacherId,
      date,
      startTime,
      endTime,
      consultType,
      capacity,
      status,
      submitting,
      locked,
    } = this.data;
    if (submitting) return;

    if (!teacherId) {
      showError('缺少咨询师信息');
      return;
    }
    if (!locked && !date) {
      showError('请选择日期');
      return;
    }
    if (!locked && startTime >= endTime) {
      showError('结束时间须晚于开始时间');
      return;
    }

    this.setData({ submitting: true });
    const payload = {
      action: id ? 'updateTimeSlot' : 'addTimeSlot',
      teacherId,
      date,
      start_time: startTime,
      end_time: endTime,
      type: consultType,
      capacity: consultType === 'oneToOne' ? 1 : Number(capacity),
      status,
    };
    if (id) payload.slotId = id;

    callFunction('admin', payload)
      .then(() => {
        showSuccess('保存成功');
        setTimeout(() => wx.navigateBack(), 1200);
      })
      .catch((err) => showError(err.message || '保存失败'))
      .finally(() => this.setData({ submitting: false }));
  },

  onDelete() {
    const { id, deleting, bookedCount } = this.data;
    if (!id || deleting || bookedCount > 0) return;

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除该档期吗？',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ deleting: true });
        callFunction('admin', { action: 'deleteTimeSlot', slotId: id })
          .then(() => {
            showSuccess('已删除');
            setTimeout(() => wx.navigateBack(), 1200);
          })
          .catch((err) => showError(err.message || '删除失败'))
          .finally(() => this.setData({ deleting: false }));
      },
    });
  },
});
