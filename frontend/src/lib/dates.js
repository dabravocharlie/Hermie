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
  return `in ${days} days`;
}

// Given a payday "anchor" date + frequency, find the next payday on or after
// `from`. Weekly steps 7 days, biweekly 14, monthly keeps the day-of-month
// (clamped for short months).
function addMonthsClamped(date, day) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}

export function nextPayday(anchorStr, frequency, from = new Date()) {
  const anchor = parseDateLocal(anchorStr);
  if (!anchor) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let d = new Date(anchor);
  let guard = 0;
  if (frequency === "monthly") {
    const day = anchor.getDate();
    while (d < today && guard++ < 600) d = addMonthsClamped(d, day);
  } else {
    const step = frequency === "weekly" ? 7 : 14;
    while (d < today && guard++ < 2000) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
  }
  return d;
}

// Attach the next payday + days-until to each income source that has a date.
export function upcomingPaydays(income, from = new Date()) {
  return income
    .filter((i) => i.next_date)
    .map((i) => {
      const date = nextPayday(i.next_date, i.frequency, from);
      return { ...i, payDate: date, days: daysUntil(date, from) };
    })
    .filter((x) => x.payDate && x.days != null)
    .sort((a, b) => a.days - b.days);
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
