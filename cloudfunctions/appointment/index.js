const { cloud, db, getUserByOpenId, enrichAppointments, COLLECTIONS } = require('./db');

const _ = db.command;
const C = COLLECTIONS;

async function createAppointment(openId, data) {
  const { slotId, type, bookedBy } = data;
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error('用户不存在');

  const slotRes = await db.collection(C.TIME_SLOTS).doc(slotId).get();
  const slot = slotRes.data;
  if (!slot || slot.status !== 'open') throw new Error('时段不可预约');
  if ((slot.booked_count || 0) >= (slot.capacity || 1)) throw new Error('时段已满');

  const newBookedCount = (slot.booked_count || 0) + 1;
  const updateRes = await db
    .collection(C.TIME_SLOTS)
    .where({
      _id: slotId,
      booked_count: _.lt(slot.capacity || 1),
    })
    .update({
      data: {
        booked_count: _.inc(1),
        status: newBookedCount >= (slot.capacity || 1) ? 'full' : 'open',
      },
    });

  if (!updateRes.stats || updateRes.stats.updated === 0) {
    throw new Error('预约失败，时段可能已满');
  }

  const now = db.serverDate();
  const addRes = await db.collection(C.APPOINTMENTS).add({
    data: {
      user_id: user._id,
      _openid: openId,
      teacher_id: slot.teacher_id,
      slot_id: slotId,
      type: type || slot.type,
      status: 'booked',
      booked_by: bookedBy || 'self',
      created_at: now,
    },
  });

  return { appointmentId: addRes._id };
}

async function cancelAppointment(openId, appointmentId) {
  const user = await getUserByOpenId(openId);
  const apptRes = await db.collection(C.APPOINTMENTS).doc(appointmentId).get();
  const appt = apptRes.data;
  if (!appt) throw new Error('预约不存在');
  if (appt.status !== 'booked') throw new Error('当前状态不可取消');
  if (user.role !== 'admin' && appt._openid !== openId) {
    throw new Error('无权限取消');
  }

  await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
    data: { status: 'cancelled', updated_at: db.serverDate() },
  });

  await db.collection(C.TIME_SLOTS).doc(appt.slot_id).update({
    data: {
      booked_count: _.inc(-1),
      status: 'open',
    },
  });

  return { success: true };
}

async function listAppointments(openId, data) {
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error('用户不存在');

  let query = {};
  const { scope, status } = data;

  if (scope === 'self') {
    query._openid = openId;
  } else if (scope === 'teacher') {
    if (user.role === 'teacher' && user.teacher_id) {
      query.teacher_id = user.teacher_id;
    } else if (user.role === 'admin') {
      // admin can see all booked for verify page
    } else {
      throw new Error('无权限');
    }
  }

  if (status) query.status = status;
  if (scope === 'teacher' && user.role === 'teacher') {
    query.teacher_id = user.teacher_id;
  }

  const res = await db
    .collection(C.APPOINTMENTS)
    .where(query)
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();

  const list = await enrichAppointments(res.data || []);
  return { list };
}

async function getDetail(openId, appointmentId) {
  const user = await getUserByOpenId(openId);
  const apptRes = await db.collection(C.APPOINTMENTS).doc(appointmentId).get();
  const appt = apptRes.data;
  if (!appt) throw new Error('预约不存在');

  const isOwner = appt._openid === openId;
  const isAdmin = user.role === 'admin';
  const isTeacher =
    user.role === 'teacher' && user.teacher_id && appt.teacher_id === user.teacher_id;

  if (!isOwner && !isAdmin && !isTeacher) {
    throw new Error('无权限查看');
  }

  const [detail] = await enrichAppointments([appt]);
  return { detail };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action } = event;

  try {
    switch (action) {
      case 'create':
        return await createAppointment(openId, event);
      case 'cancel':
        return await cancelAppointment(openId, event.appointmentId);
      case 'list':
        return await listAppointments(openId, event);
      case 'detail':
        return await getDetail(openId, event.appointmentId);
      default:
        return { error: 'Invalid action' };
    }
  } catch (err) {
    return { error: err.message || '操作失败' };
  }
};
