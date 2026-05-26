const { callFunction } = require('../../../utils/request');
const { requireRole } = require('../../../utils/auth');
const { showSuccess, showError } = require('../../../utils/index');
const { ROLE } = require('../../../constants/enums');

Page({
  data: {
    id: '',
    name: '',
    avatar: '',
    intro: '',
    types: ['oneToOne'],
    typeOneToOne: true,
    typeGroup: false,
    status: 'active',
    fileList: [],
    loading: false,
    submitting: false,
    uploading: false,
  },

  onLoad(options) {
    if (!requireRole([ROLE.ADMIN])) return;
    const id = options.id || '';
    this.setData({ id });
    if (id) {
      this.loadDetail(id);
    }
  },

  loadDetail(id) {
    this.setData({ loading: true });
    callFunction('admin', { action: 'getTeacherById', teacherId: id })
      .then((res) => {
        const teacher = res.teacher || {};
        const types = Array.isArray(teacher.types) ? teacher.types : ['oneToOne'];
        this.setData({
          name: teacher.name || '',
          avatar: teacher.avatar || '',
          intro: teacher.intro || '',
          types,
          typeOneToOne: types.indexOf('oneToOne') >= 0,
          typeGroup: types.indexOf('group') >= 0,
          status: teacher.status || 'active',
          fileList: teacher.avatar ? [{ url: teacher.avatar, isImage: true }] : [],
          loading: false,
        });
      })
      .catch((err) => {
        showError(err.message || '加载失败');
        this.setData({ loading: false });
      });
  },

  onNameChange(e) {
    this.setData({ name: String(e.detail || '').trim() });
  },

  onIntroChange(e) {
    this.setData({ intro: String(e.detail || '') });
  },

  onTypesChange(e) {
    const values = (e.detail && e.detail.value) || [];
    this.setData({
      types: values,
      typeOneToOne: values.indexOf('oneToOne') >= 0,
      typeGroup: values.indexOf('group') >= 0,
    });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail ? 'active' : 'inactive' });
  },

  afterRead(event) {
    const { file } = event.detail;
    const filePath = file.url || file.path;
    if (!filePath) return;

    this.setData({ uploading: true });
    const ext = (filePath.match(/\.(\w+)$/) || [, 'jpg'])[1];
    const cloudPath = `teacher-avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    wx.cloud
      .uploadFile({ cloudPath, filePath })
      .then((res) => {
        this.setData({
          avatar: res.fileID,
          fileList: [{ url: res.fileID, isImage: true }],
        });
      })
      .catch(() => showError('头像上传失败'))
      .finally(() => this.setData({ uploading: false }));
  },

  onDeleteAvatar() {
    this.setData({ avatar: '', fileList: [] });
  },

  onSubmit() {
    const { id, name, avatar, intro, types, status, submitting, uploading } = this.data;
    if (submitting || uploading) return;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      showError('请输入咨询师姓名');
      return;
    }
    if (!types.length) {
      showError('请至少选择一种咨询类型');
      return;
    }

    this.setData({ submitting: true });
    const payload = {
      action: id ? 'updateTeacher' : 'addTeacher',
      name: trimmedName,
      avatar,
      intro: (intro || '').trim(),
      types,
      status,
    };
    if (id) payload.teacherId = id;

    callFunction('admin', payload)
      .then(() => {
        showSuccess('保存成功');
        setTimeout(() => wx.navigateBack(), 1200);
      })
      .catch((err) => showError(err.message || '保存失败'))
      .finally(() => this.setData({ submitting: false }));
  },
});
