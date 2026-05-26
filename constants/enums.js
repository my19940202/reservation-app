const ROLE = {
  USER: 'user',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

const APPOINTMENT_STATUS = {
  BOOKED: 'booked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const CONSULT_TYPE = {
  ONE_TO_ONE: 'oneToOne',
  GROUP: 'group',
};

const APPOINTMENT_STATUS_LABEL = {
  booked: '待咨询',
  completed: '已完成',
  cancelled: '已取消',
};

const CONSULT_TYPE_LABEL = {
  oneToOne: '一对一',
  group: '一对多',
};

module.exports = {
  ROLE,
  APPOINTMENT_STATUS,
  CONSULT_TYPE,
  APPOINTMENT_STATUS_LABEL,
  CONSULT_TYPE_LABEL,
};
