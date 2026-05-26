const { getDateStr, getDateTimeStr, getDayOfYear } = require('./date');

function showToast(title, icon) {
  wx.showToast({
    title,
    icon: icon || 'none',
    duration: 2000,
  });
}

function showSuccess(msg) {
  showToast(msg, 'success');
}

function showError(msg) {
  showToast(msg, 'none');
}

module.exports = {
  showToast,
  showSuccess,
  showError,
  getDateStr,
  getDateTimeStr,
  getDayOfYear,
};
