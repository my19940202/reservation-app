function getDateStr(time) {
  const date = time ? new Date(time) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateTimeStr(time) {
  const date = time ? new Date(time) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDayOfYear(date) {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - yearStart) / (1000 * 60 * 60 * 24)) + 1;
}

module.exports = {
  getDateStr,
  getDateTimeStr,
  getDayOfYear,
};
