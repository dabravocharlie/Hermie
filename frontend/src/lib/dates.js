// Given a day-of-month (1-31), return the next date that day falls on,
// clamped to months that are shorter (e.g. due_day 31 in February).
export function nextDueDate(dueDay, from = new Date()) {
  if (!dueDay) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  function build(year, monthIndex) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const day = Math.min(dueDay, lastDay);
    return new Date(year, monthIndex, day);
  }
  let candidate = build(today.getFullYear(), today.getMonth());
  if (candidate < today) {
    candidate = build(today.getFullYear(), today.getMonth() + 1);
  }
  return candidate;
}

export function daysUntil(date, from = new Date()) {
  if (!date) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((date - today) / 86400000);
}

// "Due today", "Due tomorrow", "Due in 4 days"
export function dueLabel(days) {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

// Attach next due date + days-until to each expense that has a due_day,
// and return them sorted soonest-first.
export function upcomingBills(expenses, from = new Date()) {
  return expenses
    .filter((e) => e.due_day)
    .map((e) => {
      const date = nextDueDate(e.due_day, from);
      return { ...e, dueDate: date, days: daysUntil(date, from) };
    })
    .sort((a, b) => a.days - b.days);
}
