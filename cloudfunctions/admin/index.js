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

async function listTeachers(keyword) {
  const collection = db.collection(C.TEACHERS);
  const query = keyword
    ? collection.where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
    : collection;
  const res = await query.orderBy('created_at', 'desc').limit(100).get();
  return { list: res.data || [] };
}

async function getTeacherById(teacherId) {
  if (!teacherId) throw new Error('缺少咨询师 ID');
  const res = await db.collection(C.TEACHERS).doc(teacherId).get();
  if (!res.data) throw new Error('咨询师不存在');
  return { teacher: res.data };
}

async function addTeacher(data) {
  const { name, avatar, intro, types, status } = data;
  if (!name || !String(name).trim()) throw new Error('姓名不能为空');
  const res = await db.collection(C.TEACHERS).add({
    data: {
      name: String(name).trim(),
      avatar: avatar || '',
      intro: intro || '',
      types: Array.isArray(types) && types.length ? types : ['oneToOne'],
      status: status || 'active',
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    },
  });
  return { teacherId: res._id };
}

async function updateTeacher(data) {
  const { teacherId, name, avatar, intro, types, status } = data;
  if (!teacherId) throw new Error('缺少咨询师 ID');
  if (!name || !String(name).trim()) throw new Error('姓名不能为空');
  await db.collection(C.TEACHERS).doc(teacherId).update({
    data: {
      name: String(name).trim(),
      avatar: avatar || '',
      intro: intro || '',
      types: Array.isArray(types) ? types : [],
      status: status || 'inactive',
      updated_at: db.serverDate(),
    },
  });
  return { success: true };
}

function normalizeSlotPayload(data) {
  const teacherId = data.teacherId || data.teacher_id;
  const date = data.date;
  const start_time = data.start_time;
  const end_time = data.end_time;
  const type = data.type || 'oneToOne';

  if (!teacherId) throw new Error('缺少咨询师 ID');
  if (!date || !start_time || !end_time) throw new Error('请填写完整时段信息');
  if (start_time >= end_time) throw new Error('结束时间须晚于开始时间');

  let capacity = data.capacity;
  if (type === 'oneToOne') {
    capacity = 1;
  } else if (!capacity || Number(capacity) < 1) {
    throw new Error('一对多名额至少为 1');
  } else {
    capacity = Number(capacity);
  }

  return { teacherId, date, start_time, end_time, type, capacity };
}

async function listTimeSlots(teacherId, fromDate) {
  if (!teacherId) throw new Error('缺少咨询师 ID');
  const query = { teacher_id: teacherId };
  if (fromDate) query.date = _.gte(fromDate);
  const res = await db
    .collection(C.TIME_SLOTS)
    .where(query)
    .orderBy('date', 'asc')
    .orderBy('start_time', 'asc')
    .limit(200)
    .get();
  return { list: res.data || [] };
}

async function getTimeSlotById(slotId) {
  if (!slotId) throw new Error('缺少档期 ID');
  const res = await db.collection(C.TIME_SLOTS).doc(slotId).get();
  if (!res.data) throw new Error('档期不存在');
  return { slot: res.data };
}

async function addTimeSlot(data) {
  const payload = normalizeSlotPayload(data);
  const teacherRes = await db.collection(C.TEACHERS).doc(payload.teacherId).get();
  if (!teacherRes.data) throw new Error('咨询师不存在');

  const res = await db.collection(C.TIME_SLOTS).add({
    data: {
      teacher_id: payload.teacherId,
      date: payload.date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      type: payload.type,
      capacity: payload.capacity,
      booked_count: 0,
      status: 'open',
      created_at: db.serverDate(),
      updated_at: db.serverDate(),
    },
  });
  return { slotId: res._id };
}

async function updateTimeSlot(data) {
  const { slotId, status, capacity } = data;
  if (!slotId) throw new Error('缺少档期 ID');

  const slotRes = await db.collection(C.TIME_SLOTS).doc(slotId).get();
  const slot = slotRes.data;
  if (!slot) throw new Error('档期不存在');

  const bookedCount = slot.booked_count || 0;
  const updateData = { updated_at: db.serverDate() };

  if (bookedCount > 0) {
    if (capacity !== undefined && capacity !== null && capacity !== '') {
      const newCap = Number(capacity);
      if (Number.isNaN(newCap) || newCap < bookedCount) {
        throw new Error(`名额不能小于已预约数 ${bookedCount}`);
      }
      updateData.capacity = newCap;
    }

    const finalCap =
      updateData.capacity !== undefined ? updateData.capacity : slot.capacity || 1;

    if (status === 'closed') {
      updateData.status = 'closed';
    } else {
      updateData.status = bookedCount >= finalCap ? 'full' : 'open';
    }
  } else {
    const payload = normalizeSlotPayload({
      ...slot,
      ...data,
      teacherId: data.teacherId || slot.teacher_id,
    });
    updateData.teacher_id = payload.teacherId;
    updateData.date = payload.date;
    updateData.start_time = payload.start_time;
    updateData.end_time = payload.end_time;
    updateData.type = payload.type;
    updateData.capacity = payload.capacity;
    updateData.status = status === 'closed' ? 'closed' : 'open';
  }

  await db.collection(C.TIME_SLOTS).doc(slotId).update({ data: updateData });
  return { success: true };
}

async function deleteTimeSlot(slotId) {
  if (!slotId) throw new Error('缺少档期 ID');
  const slotRes = await db.collection(C.TIME_SLOTS).doc(slotId).get();
  const slot = slotRes.data;
  if (!slot) throw new Error('档期不存在');
  if ((slot.booked_count || 0) > 0) throw new Error('已有预约的档期不可删除');
  await db.collection(C.TIME_SLOTS).doc(slotId).remove();
  return { success: true };
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
      case 'listTeachers':
        return await listTeachers(event.keyword);
      case 'getTeacherById':
        return await getTeacherById(event.teacherId);
      case 'addTeacher':
        return await addTeacher(event);
      case 'updateTeacher':
        return await updateTeacher(event);
      case 'listTimeSlots':
        return await listTimeSlots(event.teacherId, event.fromDate);
      case 'getTimeSlotById':
        return await getTimeSlotById(event.slotId);
      case 'addTimeSlot':
        return await addTimeSlot(event);
      case 'updateTimeSlot':
        return await updateTimeSlot(event);
      case 'deleteTimeSlot':
        return await deleteTimeSlot(event.slotId);
      default:
        return { error: 'Invalid action' };
    }
  } catch (err) {
    return { error: err.message || '操作失败' };
  }
};
