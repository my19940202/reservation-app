const COLLECTIONS = require('../../../constants/collections');
const { getDb } = require('../../../utils/request');
const { showSuccess, showError, getDateTimeStr } = require('../../../utils/index');

Page({
  data: {
    openId: '',
    name: '',
    phone: '',
    agreedToTerms: false,
    submitting: false,
  },

  onLoad() {
    const openId = wx.getStorageSync('openId');
    const agreedToTerms = !!wx.getStorageSync('profileLegalAgreed');
    const cached = wx.getStorageSync('userInfo') || {};
    this.setData({
      openId,
      name: cached.name && cached.name !== '微信用户' ? cached.name : '',
      phone: cached.phone || '',
      agreedToTerms,
    });
    this.loadUser(openId);
  },

  loadUser(openId) {
    if (!openId) return;
    const db = getDb();
    if (!db) return;
    db.collection(COLLECTIONS.USERS)
      .where({ _openid: openId })
      .limit(1)
      .get()
      .then((res) => {
        const user = (res.data && res.data[0]) || null;
        if (user) {
          this.setData({
            name: user.name && user.name !== '微信用户' ? user.name : this.data.name,
            phone: user.phone || this.data.phone,
          });
        }
      });
  },

  onNameChange(e) {
    this.setData({ name: String(e.detail || '').trim() });
  },

  onPhoneChange(e) {
    this.setData({ phone: String(e.detail || '').trim() });
  },

  onAgreementChange(e) {
    const values = (e.detail && e.detail.value) || [];
    const agreedToTerms = values.indexOf('agreed') >= 0;
    this.setData({ agreedToTerms });
    wx.setStorageSync('profileLegalAgreed', agreedToTerms);
  },

  openTerms() {
    wx.navigateTo({ url: '/pages/about/user-terms/index' });
  },

  openPrivacy() {
    wx.navigateTo({ url: '/pages/about/user-privacy/index' });
  },

  onSubmit() {
    const { openId, name, phone, agreedToTerms, submitting } = this.data;
    if (submitting) return;

    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName) {
      showError('请输入姓名');
      return;
    }
    if (trimmedPhone && !/^1\d{10}$/.test(trimmedPhone)) {
      showError('请输入正确的手机号');
      return;
    }
    if (!agreedToTerms) {
      showError('请先阅读并同意用户服务协议与隐私政策');
      return;
    }

    const db = getDb();
    if (!db || !openId) {
      showError('未登录或云开发未初始化');
      return;
    }

    this.setData({ submitting: true });
    db.collection(COLLECTIONS.USERS)
      .where({ _openid: openId })
      .update({
        data: {
          name: trimmedName,
          phone: trimmedPhone,
          updated_at: getDateTimeStr(),
        },
      })
      .then(() => {
        const userInfo = {
          ...(wx.getStorageSync('userInfo') || {}),
          name: trimmedName,
          phone: trimmedPhone,
        };
        wx.setStorageSync('userInfo', userInfo);
        const app = getApp();
        if (app && app.refreshSession) {
          app.refreshSession();
        }
        showSuccess('保存成功');
        setTimeout(() => wx.navigateBack(), 1200);
      })
      .catch(() => {
        showError('保存失败，请稍后重试');
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },
});
