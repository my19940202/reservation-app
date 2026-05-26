function getCloud() {
  const app = getApp();
  return app.globalData && app.globalData.wxCloud;
}

function callFunction(name, data) {
  const wxCloud = getCloud();
  if (!wxCloud) {
    return Promise.reject(new Error('云开发未初始化'));
  }
  return new Promise((resolve, reject) => {
    wxCloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result || {};
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve(result);
      },
      fail: reject,
    });
  });
}

function getDb() {
  const app = getApp();
  return app.globalData && app.globalData.db;
}

module.exports = {
  callFunction,
  getDb,
  getCloud,
};
