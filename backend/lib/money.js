import { occurrencesInMonth, remainingOccurrencesInMonth } from "./dates.js";

// Converts an amount at a given frequency into its monthly equivalent, so
// weekly, bi-weekly, and monthly items can be summed on the same footing.
// This is a SMOOTHED AVERAGE (weekly: 52 pay periods / 12 months. biweekly:
// 26 / 12) \u2014 it does not correspond to any specific calendar month. Used as
// a fallback when an item has no anchor date to compute a real count from.
export function toMonthly(amount, frequency) {
  const n = Number(amount) || 0;
  switch (frequency) {
    case "weekly":
      return (n * 52) / 12;
    case "biweekly":
      return (n * 26) / 12;
    case "monthly":
    default:
      return n;
  }
}

// The REAL total for one item in a specific calendar month, using its
// anchor date (next_date) to count actual occurrences of weekly/biweekly
// items within that month. Falls back to the smoothed average if the item
// has no anchor date set yet.
export function actualMonthlyAmount(item, year, month) {
  const amt = Number(item.amount) || 0;
  const freq = item.frequency;
  if (freq === "monthly" || freq === "once" || !freq) return amt;
  const anchor = item.next_date;
  if (!anchor) return toMonthly(amt, freq);
  const n = occurrencesInMonth(anchor, freq, year, month);
  return amt * (n ?? 0);
}

// Sums actualMonthlyAmount across a list of income sources or expenses for
// the calendar month containing `from` (defaults to today).
export function actualMonthlyTotal(items, from = new Date()) {
  const year = from.getFullYear();
  const month = from.getMonth();
  return items.reduce((s, item) => s + actualMonthlyAmount(item, year, month), 0);
}

// The remaining amount for one item from today through the end of the
// month \u2014 counts only occurrences that HAVEN'T happened yet. Use this
// (not actualMonthlyAmount) for a "right now" snapshot like Safe to Spend,
// since anything already received is presumably already in the bank total.
// Falls back to half the smoothed average when there's no anchor date, as a
// rough "about half the month remains" approximation.
export function remainingMonthlyAmount(item, from = new Date()) {
  const amt = Number(item.amount) || 0;
  const freq = item.frequency;
  if (freq === "monthly" || freq === "once" || !freq) {
    if (!item.next_date) return amt; // can't tell if it's passed yet; assume still owed
  }
  const anchor = item.next_date;
  if (!anchor) return toMonthly(amt, freq) / 2;
  const n = remainingOccurrencesInMonth(anchor, freq, from);
  return amt * (n ?? 0);
}

export function remainingMonthlyTotal(items, from = new Date()) {
  return items.reduce((s, item) => s + remainingMonthlyAmount(item, from), 0);
}
