const { ROLE } = require('../constants/enums');

function getOpenId() {
  return wx.getStorageSync('openId') || '';
}

function getUserInfo() {
  return wx.getStorageSync('userInfo') || null;
}

function getUserRole() {
  const userInfo = getUserInfo();
  return (userInfo && userInfo.role) || ROLE.USER;
}

function isAdmin() {
  return getUserRole() === ROLE.ADMIN;
}

function isTeacher() {
  return getUserRole() === ROLE.TEACHER;
}

function requireRole(roles, redirectUrl) {
  const role = getUserRole();
  if (!roles.includes(role)) {
    wx.showToast({ title: '无权限访问', icon: 'none' });
    wx.redirectTo({ url: redirectUrl || '/pages/home/index' });
    return false;
  }
  return true;
}

module.exports = {
  getOpenId,
  getUserInfo,
  getUserRole,
  isAdmin,
  isTeacher,
  requireRole,
};
