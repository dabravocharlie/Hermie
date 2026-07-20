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

// Given an item's cost, the user's current monthly leftover (safeToSpend),
// and their total bank balance across accounts, describe when it fits their
// budget. Deliberately factual/descriptive, never directive ("you should buy
// this") \u2014 states what the numbers show. Money already saved counts first;
// only the remaining amount is projected against the monthly pace. Includes
// a raw targetDate (Date | null) so callers can prefill a calendar reminder
// without re-deriving the math.
export function budgetFit(cost, monthlyLeft, bankTotal = 0) {
  const c = Number(cost) || 0;
  const left = Number(monthlyLeft) || 0;
  const bank = Number(bankTotal) || 0;
  const remaining = c - bank;

  if (remaining <= 0) {
    return {
      status: "fits",
      label: "Already covered by your bank balance",
      detail: `Your accounts total ${formatCurrency(bank)}, enough for this ${formatCurrency(c)} item.`,
      targetDate: null,
    };
  }
  if (left <= 0) {
    return {
      status: "tight",
      label: "Budget is tight right now",
      detail: bank > 0
        ? `You have ${formatCurrency(bank)} saved, but no monthly leftover currently to add toward the remaining ${formatCurrency(remaining)}.`
        : "No monthly leftover currently \u2014 review bills or income first.",
      targetDate: null,
    };
  }
  const months = Math.ceil(remaining / left);
  const target = new Date();
  target.setMonth(target.getMonth() + months);
  const targetLabel = target.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return {
    status: "save",
    label: `About ${months} month${months === 1 ? "" : "s"} to save`,
    detail: bank > 0
      ? `You have ${formatCurrency(bank)} saved and about ${formatCurrency(left)}/mo left over \u2014 you'd cover the remaining ${formatCurrency(remaining)} by around ${targetLabel}.`
      : `At your current pace (${formatCurrency(left)}/mo left over), you'd have this by around ${targetLabel}.`,
    targetDate: target,
  };
}
