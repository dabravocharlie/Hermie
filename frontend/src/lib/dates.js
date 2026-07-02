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

// Parse a 'YYYY-MM-DD' (or ISO) string into a local Date at midnight,
// avoiding the timezone off-by-one that comes from new Date("YYYY-MM-DD").
export function parseDateLocal(s) {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Countdown label for an upcoming (or past) date.
export function whenLabel(days) {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 14) return `in ${days} days`;
  return `in ${days} days`;
}

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
