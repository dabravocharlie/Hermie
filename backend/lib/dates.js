// Parse a 'YYYY-MM-DD' (or ISO) string into a local Date at midnight,
// avoiding the timezone off-by-one that comes from new Date("YYYY-MM-DD").
function parseDateLocal(s) {
  if (!s) return null;
  const str = typeof s === "string" ? s : String(s);
  const [y, m, d] = str.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Counts how many times a weekly/biweekly item anchored on `anchorStr`
// actually falls within a given calendar month (year, 0-indexed month).
// Uses modular arithmetic relative to the anchor so it works correctly
// whether the anchor date is before, inside, or after the target month \u2014
// the recurrence is treated as an infinite periodic sequence, not just
// forward steps from a single instance.
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
