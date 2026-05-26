const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const COLLECTIONS = {
  USERS: 'reserve_users',
  USER_PACKAGES: 'reserve_user_packages',
  TEACHERS: 'reserve_teachers',
  TIME_SLOTS: 'reserve_time_slots',
  APPOINTMENTS: 'reserve_appointments',
};

async function getUserByOpenId(openId) {
  const res = await db.collection(COLLECTIONS.USERS).where({ _openid: openId }).limit(1).get();
  return (res.data && res.data[0]) || null;
}

async function assertAdmin(openId) {
  const user = await getUserByOpenId(openId);
  if (!user || user.role !== 'admin') {
    const err = new Error('无管理员权限');
    err.code = 403;
    throw err;
  }
  return user;
}

async function getActivePackage(openId, type) {
  const res = await db
    .collection(COLLECTIONS.USER_PACKAGES)
    .where({ _openid: openId, status: 'active' })
    .limit(1)
    .get();
  const pkg = (res.data && res.data[0]) || null;
  if (!pkg) {
    throw new Error('无有效次数包');
  }
  const now = new Date();
  if (pkg.end_date && new Date(pkg.end_date) < now) {
    throw new Error('次数包已过期');
  }
  const remainField = type === 'group' ? 'group_remaining' : 'one_to_one_remaining';
  if ((pkg[remainField] || 0) <= 0) {
    throw new Error('剩余次数不足');
  }
  return pkg;
}

async function enrichAppointments(list) {
  if (!list.length) return [];
  const userIds = [...new Set(list.map((i) => i.user_id).filter(Boolean))];
  const teacherIds = [...new Set(list.map((i) => i.teacher_id).filter(Boolean))];
  const slotIds = [...new Set(list.map((i) => i.slot_id).filter(Boolean))];

  const [usersRes, teachersRes, slotsRes] = await Promise.all([
    userIds.length
      ? db.collection(COLLECTIONS.USERS).where({ _id: db.command.in(userIds) }).get()
      : { data: [] },
    teacherIds.length
      ? db.collection(COLLECTIONS.TEACHERS).where({ _id: db.command.in(teacherIds) }).get()
      : { data: [] },
    slotIds.length
      ? db.collection(COLLECTIONS.TIME_SLOTS).where({ _id: db.command.in(slotIds) }).get()
      : { data: [] },
  ]);

  const userMap = {};
  (usersRes.data || []).forEach((u) => {
    userMap[u._id] = u.name || '用户';
  });
  const teacherMap = {};
  (teachersRes.data || []).forEach((t) => {
    teacherMap[t._id] = t.name || '咨询师';
  });
  const slotMap = {};
  (slotsRes.data || []).forEach((s) => {
    slotMap[s._id] = s;
  });

  return list.map((item) => {
    const slot = slotMap[item.slot_id] || {};
    return {
      ...item,
      user_name: userMap[item.user_id] || item.user_name || '用户',
      teacher_name: teacherMap[item.teacher_id] || item.teacher_name || '咨询师',
      date: slot.date || item.date || '',
      start_time: slot.start_time || item.start_time || '',
      end_time: slot.end_time || item.end_time || '',
    };
  });
}

module.exports = {
  cloud,
  db,
  COLLECTIONS,
  getUserByOpenId,
  assertAdmin,
  getActivePackage,
  enrichAppointments,
};
