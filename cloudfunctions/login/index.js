const { cloud, db, getUserByOpenId, COLLECTIONS } = require('./db');

const C = COLLECTIONS;

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  if (!openId) {
    return { error: '无法获取 openId' };
  }

  let user = await getUserByOpenId(openId);
  if (!user) {
    const now = db.serverDate();
    await db.collection(C.USERS).add({
      data: {
        _openid: openId,
        name: '微信用户',
        phone: '',
        role: 'user',
        created_at: now,
      },
    });
    user = await getUserByOpenId(openId);
  }

  return { openId, user };
};
