const istanbulDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
});

const dateParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(istanbulDate.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return [Number(parts.year), Number(parts.month), Number(parts.day)];
};

export const getWeekStartKey = (value = new Date()) => {
  const parts = dateParts(value);
  if (!parts) return null;
  const date = new Date(Date.UTC(...[parts[0], parts[1] - 1, parts[2]]));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
};

export const getWeeklyQuestionTotal = (logs, now = new Date()) => {
  const currentWeek = getWeekStartKey(now);
  if (!currentWeek) return 0;
  return logs.reduce((total, log) => {
    if (getWeekStartKey(log.created_at) !== currentWeek) return total;
    return total + (Number(log.questions_solved) || 0);
  }, 0);
};
