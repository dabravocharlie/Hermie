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

// Given an item's cost and the user's current monthly leftover (safeToSpend),
// describe when it fits their budget. Deliberately factual/descriptive, never
// directive ("you should buy this") \u2014 states what the numbers show.
export function budgetFit(cost, monthlyLeft) {
  const c = Number(cost) || 0;
  const left = Number(monthlyLeft) || 0;

  if (left <= 0) {
    return { status: "tight", label: "Budget is tight right now", detail: "No monthly leftover currently \u2014 review bills or income first." };
  }
  if (c <= left) {
    return { status: "fits", label: "Fits in this month's budget", detail: `You have about ${formatCurrency(left)} left over this month.` };
  }
  const months = Math.ceil(c / left);
  const target = new Date();
  target.setMonth(target.getMonth() + months);
  const targetLabel = target.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return {
    status: "save",
    label: `About ${months} month${months === 1 ? "" : "s"} to save`,
    detail: `At your current pace (${formatCurrency(left)}/mo left over), you'd have this by around ${targetLabel}.`,
  };
}

export function categoryMeta(key) {
  return (
    CATEGORIES.find((c) => c.key === key) || {
      key,
      label: key ? key.charAt(0).toUpperCase() + key.slice(1) : "Other",
      emoji: "\u2022",
    }
  );
}
