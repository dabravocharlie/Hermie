// Converts an amount at a given frequency into its monthly equivalent, so
// weekly, bi-weekly, and monthly items can be summed on the same footing.
// weekly: 52 pay periods / 12 months. biweekly: 26 / 12.
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
