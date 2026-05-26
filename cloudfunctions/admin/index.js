const { cloud, db, assertAdmin, enrichAppointments, COLLECTIONS } = require('./db');

const _ = db.command;
const C = COLLECTIONS;

async function getStats() {
  const [users, teachers, appointments] = await Promise.all([
    db.collection(C.USERS).where({ role: 'user' }).count(),
    db.collection(C.TEACHERS).where({ status: 'active' }).count(),
    db.collection(C.APPOINTMENTS).count(),
  ]);

  const [booked, completed, cancelled] = await Promise.all([
    db.collection(C.APPOINTMENTS).where({ status: 'booked' }).count(),
    db.collection(C.APPOINTMENTS).where({ status: 'completed' }).count(),
    db.collection(C.APPOINTMENTS).where({ status: 'cancelled' }).count(),
  ]);

  return {
    stats: {
      userCount: users.total || 0,
      teacherCount: teachers.total || 0,
      appointmentTotal: appointments.total || 0,
      bookedCount: booked.total || 0,
      completedCount: completed.total || 0,
      cancelledCount: cancelled.total || 0,
    },
  };
}

async function listByTeacher(teacherId) {
  const res = await db
    .collection(C.APPOINTMENTS)
    .where({ teacher_id: teacherId })
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();
  const list = await enrichAppointments(res.data || []);
  return { list };
}

async function listByUser(keyword) {
  const userRes = await db
    .collection(C.USERS)
    .where(
      _.or([{ name: db.RegExp({ regexp: keyword, options: 'i' }) }, { phone: keyword }])
    )
    .limit(20)
    .get();
  const users = userRes.data || [];
  if (!users.length) return { list: [] };

  const openIds = users.map((u) => u._openid);
  const apptRes = await db
    .collection(C.APPOINTMENTS)
    .where({ _openid: _.in(openIds) })
    .orderBy('created_at', 'desc')
    .limit(100)
    .get();
  const list = await enrichAppointments(apptRes.data || []);
  return { list };
}

async function updateAppointment(openId, data) {
  const { appointmentId, status, adminNote } = data;
  const apptRes = await db.collection(C.APPOINTMENTS).doc(appointmentId).get();
  const appt = apptRes.data;
  if (!appt) throw new Error('预约不存在');

  if (appt.status === 'completed') {
    await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
      data: {
        admin_note: adminNote || '',
        updated_by: openId,
        updated_at: db.serverDate(),
      },
    });
    return { success: true };
  }

  const oldStatus = appt.status;
  const newStatus = status || oldStatus;

  if (newStatus === 'cancelled' && oldStatus === 'booked') {
    await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
      data: {
        status: 'cancelled',
        admin_note: adminNote || '',
        updated_by: openId,
        updated_at: db.serverDate(),
      },
    });
    await db.collection(C.TIME_SLOTS).doc(appt.slot_id).update({
      data: { booked_count: _.inc(-1), status: 'open' },
    });
    return { success: true };
  }

  if (newStatus === 'completed' && oldStatus === 'booked') {
    const pkgRes = await db
      .collection(C.USER_PACKAGES)
      .where({ _openid: appt._openid, status: 'active' })
      .limit(1)
      .get();
    const pkg = (pkgRes.data && pkgRes.data[0]) || null;
    if (!pkg) throw new Error('用户无有效次数包');
    const remainField =
      appt.type === 'group' ? 'group_remaining' : 'one_to_one_remaining';
    if ((pkg[remainField] || 0) <= 0) throw new Error('用户剩余次数不足');

    await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
      data: {
        status: 'completed',
        verified_at: db.serverDate(),
        verified_by: openId,
        admin_note: adminNote || '',
        updated_by: openId,
        updated_at: db.serverDate(),
      },
    });
    await db.collection(C.USER_PACKAGES).doc(pkg._id).update({
      data: { [remainField]: _.inc(-1) },
    });
    return { success: true };
  }

  await db.collection(C.APPOINTMENTS).doc(appointmentId).update({
    data: {
      status: newStatus,
      admin_note: adminNote || '',
      updated_by: openId,
      updated_at: db.serverDate(),
    },
  });
  return { success: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action } = event;

  try {
    await assertAdmin(openId);
    switch (action) {
      case 'getStats':
        return await getStats();
      case 'listByTeacher':
        return await listByTeacher(event.teacherId);
      case 'listByUser':
        return await listByUser(event.keyword);
      case 'updateAppointment':
        return await updateAppointment(openId, event);
      default:
        return { error: 'Invalid action' };
    }
  } catch (err) {
    return { error: err.message || '操作失败' };
  }
};
