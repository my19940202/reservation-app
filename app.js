// app.js
const COLLECTIONS = require('./constants/collections');

App({
  globalData: {
    wxCloud: null,
    db: null,
    userInfo: null,
    userPackage: null,
  },

  onLaunch: async function () {
    this._resolveInit = null;
    this.initPromise = new Promise((resolve) => {
      this._resolveInit = resolve;
    });

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库以使用云能力');
      if (this._resolveInit) this._resolveInit();
      return;
    }
    const wxCloud = new wx.cloud.Cloud({
      resourceEnv: 'cloud1-5g5eyjtze161c202',
      resourceAppid: 'wx47cf005024af6c8f',
    });
    await wxCloud.init();
    const db = wxCloud.database();
    this.globalData = {
      ...this.globalData,
      wxCloud,
      db,
    };
    this.fetchInitData();

    if (this._resolveInit) this._resolveInit();
  },

  getInitPromise() {
    return this.initPromise;
  },

  fetchInitData() {
    const openId = wx.getStorageSync('openId');
    if (!openId) {
      this.callLogin();
    } else {
      this.fetchUserInfo(openId);
      this.fetchUserPackage(openId);
    }
  },

  callLogin() {
    if (this._loginPending) return;
    this._loginPending = true;
    this.globalData.wxCloud.callFunction({
      name: 'login',
      success: (res) => {
        const result = res.result || {};
        if (result.error) {
          console.error('login error', result.error);
          return;
        }
        if (result.openId) {
          wx.setStorageSync('openId', result.openId);
          if (result.user) {
            wx.setStorageSync('userInfo', result.user);
            this.globalData.userInfo = result.user;
          } else {
            this.fetchUserInfo(result.openId, true);
          }
          this.fetchUserPackage(result.openId);
        }
      },
      fail: (err) => {
        console.error('login failed', err);
      },
      complete: () => {
        this._loginPending = false;
      },
    });
  },

  fetchUserInfo(openId, fromLogin) {
    this.globalData.db
      .collection(COLLECTIONS.USERS)
      .where({ _openid: openId })
      .limit(1)
      .get()
      .then((res) => {
        const user = (res.data && res.data[0]) || null;
        if (user) {
          wx.setStorageSync('userInfo', user);
          this.globalData.userInfo = user;
        } else if (!fromLogin) {
          // 库中无对应用户（如历史数据缺 _openid），重新 login 补建
          this.callLogin();
        }
      });
  },

  fetchUserPackage(openId) {
    this.globalData.db
      .collection(COLLECTIONS.USER_PACKAGES)
      .where({ _openid: openId, status: 'active' })
      .limit(1)
      .get()
      .then((res) => {
        const pkg = (res.data && res.data[0]) || null;
        wx.setStorageSync('userPackage', pkg);
        this.globalData.userPackage = pkg;
      });
  },

  refreshSession() {
    const openId = wx.getStorageSync('openId');
    if (openId) {
      this.fetchUserInfo(openId);
      this.fetchUserPackage(openId);
    }
  },
});
