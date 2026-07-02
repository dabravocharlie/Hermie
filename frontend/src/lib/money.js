// Keep the frontend's money math identical to the backend's.
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

// $1,284 style. Pass cents=true for line items like $142.50.
export function formatCurrency(n, cents = false) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

export const FREQUENCIES = [
  { key: "weekly", label: "Weekly", short: "/wk" },
  { key: "biweekly", label: "Every 2 weeks", short: "/2wk" },
  { key: "monthly", label: "Monthly", short: "/mo" },
];

export function freqShort(key) {
  return FREQUENCIES.find((f) => f.key === key)?.short || "/mo";
}

// Pre-set expense categories, plus "custom" which lets the user type their own.
export const CATEGORIES = [
  { key: "housing", label: "Housing", emoji: "\u{1F3E0}" },
  { key: "transport", label: "Transportation", emoji: "\u{1F697}" },
  { key: "utilities", label: "Utilities", emoji: "\u{1F4A1}" },
  { key: "subscriptions", label: "Subscriptions", emoji: "\u{1F4FA}" },
  { key: "insurance", label: "Insurance", emoji: "\u{1F6E1}" },
  { key: "debt", label: "Credit & debt", emoji: "\u{1F4B3}" },
  { key: "food", label: "Food & groceries", emoji: "\u{1F37D}" },
  { key: "other", label: "Other", emoji: "\u2022" },
];

export function categoryMeta(key) {
  return (
    CATEGORIES.find((c) => c.key === key) || {
      key,
      label: key ? key.charAt(0).toUpperCase() + key.slice(1) : "Other",
      emoji: "\u2022",
    }
  );
}
