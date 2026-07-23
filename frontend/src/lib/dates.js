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

// The most recent due date for a bill that is on or before `from` (i.e. the
// start of the billing cycle we're currently in). Used to tell whether a
// "paid" mark is still current or belongs to a past cycle. Bills without a
// due_day have no cycle concept, so this returns null for those \u2014 the
// paid checkbox then behaves as a simple manual toggle with no auto-reset.
export function lastDueOnOrBefore(dueDay, from = new Date()) {
  if (!dueDay) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = nextDueDate(dueDay, today); // always >= today
  if (next.getTime() === today.getTime()) return today;
  const prevMonthAnchor = new Date(next.getFullYear(), next.getMonth() - 1, 1);
  const lastDayPrev = new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth() + 1, 0).getDate();
  const day = Math.min(dueDay, lastDayPrev);
  return new Date(prevMonthAnchor.getFullYear(), prevMonthAnchor.getMonth(), day);
}

// Whether a bill's paid_at timestamp is still valid for the current cycle.
// If there's no due_day (no cycle concept), any paid_at counts as paid.
export function isPaidForCycle(expense, from = new Date()) {
  if (!expense.paid_at) return false;
  const paidAt = new Date(expense.paid_at);
  if (!expense.due_day) return true;
  const cycleStart = lastDueOnOrBefore(expense.due_day, from);
  return cycleStart && paidAt >= cycleStart;
}

// Counts how many times a weekly/biweekly item anchored on `anchorStr`
// actually falls within a given calendar month (year, 0-indexed month).
// Uses modular arithmetic relative to the anchor so it works correctly
// whether the anchor date is before, inside, or after the target month \u2014
// the recurrence is treated as an infinite periodic sequence, not just
// forward steps from a single instance. Monthly/unset frequency is always 1
// occurrence; returns null when there's no anchor date to count from.
export function occurrencesInMonth(anchorStr, frequency, year, month) {
  const anchor = parseDateLocal(anchorStr);
  if (!anchor) return null;
  if (frequency === "monthly" || frequency === "once" || !frequency) return 1;
  const step = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : null;
  if (!step) return 1;

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // last day of month
  const msPerDay = 86400000;
  const diffDays = Math.round((monthStart - anchor) / msPerDay);
  const mod = ((diffDays % step) + step) % step;
  let d = mod === 0 ? monthStart : new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + (step - mod));

  let count = 0;
  while (d <= monthEnd) {
    count++;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
  }
  return count;
}

// Same idea as occurrencesInMonth, but counts only occurrences from `from`
// (today) through the end of that month \u2014 i.e. what HASN'T happened yet.
// This is the one to use for "safe to spend right now": income that already
// arrived earlier this month is presumably already reflected in the current
// bank balance, so counting the whole month's income on top would double it.
export function remainingOccurrencesInMonth(anchorStr, frequency, from = new Date()) {
  const anchor = parseDateLocal(anchorStr);
  if (!anchor) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (frequency === "monthly" || frequency === "once" || !frequency) {
    const lastDay = monthEnd.getDate();
    const day = Math.min(anchor.getDate(), lastDay);
    const thisMonthOccurrence = new Date(today.getFullYear(), today.getMonth(), day);
    return thisMonthOccurrence >= today ? 1 : 0;
  }
  const step = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : null;
  if (!step) return 1;

  const msPerDay = 86400000;
  const diffDays = Math.round((today - anchor) / msPerDay);
  const mod = ((diffDays % step) + step) % step;
  let d = mod === 0 ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() + (step - mod));

  let count = 0;
  while (d <= monthEnd) {
    count++;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
  }
  return count;
}
