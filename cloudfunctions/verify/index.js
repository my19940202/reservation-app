const { cloud, db, getUserByOpenId, COLLECTIONS } = require('./db');

const _ = db.command;
const C = COLLECTIONS;

async function confirmVerify(openId, appointmentId) {
  const operator = await getUserByOpenId(openId);
  if (!operator || !['teacher', 'admin'].includes(operator.role)) {
    throw new Error('无核销权限');
  }

  const apptRes = await db.collection(C.APPOINTMENTS).doc(appointmentId).get();
  const appt = apptRes.data;
  if (!appt) throw new Error('预约不存在');
  if (appt.status === 'completed') {
    return { success: true, message: '已核销' };
  }
  if (appt.status !== 'booked') {
    throw new Error('当前状态不可核销');
  }

  if (operator.role === 'teacher') {
    if (!operator.teacher_id || operator.teacher_id !== appt.teacher_id) {
      throw new Error('只能核销自己的预约');
    }
  }

  const pkgRes = await db
    .collection(C.USER_PACKAGES)
    .where({ _openid: appt._openid, status: 'active' })
    .limit(1)
    .get();
  const pkg = (pkgRes.data && pkgRes.data[0]) || null;
  if (!pkg) throw new Error('用户无有效次数包');

  const remainField =
    appt.type === 'group' ? 'group_remaining' : 'one_to_one_remaining';
  if ((pkg[remainField] || 0) <= 0) {
    throw new Error('用户剩余次数不足');
  }

  await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
    data: {
      status: 'completed',
      verified_at: db.serverDate(),
      verified_by: openId,
    },
  });

  await db.collection(C.USER_PACKAGES).doc(pkg._id).update({
    data: {
      [remainField]: _.inc(-1),
    },
  });

  return { success: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, appointmentId } = event;

  try {
    if (action === 'confirm') {
      return await confirmVerify(openId, appointmentId);
    }
    return { error: 'Invalid action' };
  } catch (err) {
    return { error: err.message || '核销失败' };
  }
};
