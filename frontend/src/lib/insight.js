import { formatCurrency, categoryMeta } from "./money.js";

// Produces a short, factual, educational observation from the user's numbers.
// This is deliberately rule-based (not an AI call) for Phase 3: it's free,
// instant, and stays strictly educational. The conversational Hermie arrives
// in Phase 6. Nothing here tells the user what to buy, sell, or do with money.
export function buildInsight({ monthlyIncome, monthlyExpenses, safeToSpend, byCategory }) {
  const income = Number(monthlyIncome) || 0;
  const expenses = Number(monthlyExpenses) || 0;

  if (income === 0 && expenses === 0) {
    return "Hi, I'm Hermie. Add your income and a few bills in the Bills tab, and I'll break down your month for you.";
  }
  if (income === 0) {
    return `You've got about ${formatCurrency(expenses)} in monthly bills logged. Add your income in the Bills tab so I can show you how it all compares.`;
  }

  const ratio = Math.round((expenses / income) * 100);

  // Largest spending category and its share of income.
  let topKey = null;
  let topVal = 0;
  for (const [k, v] of Object.entries(byCategory || {})) {
    if (v > topVal) {
      topVal = v;
      topKey = k;
    }
  }
  const topLabel = topKey ? categoryMeta(topKey).label.toLowerCase() : null;
  const topPct = topKey ? Math.round((topVal / income) * 100) : 0;

  if (safeToSpend < 0) {
    return `Heads up: your bills come to about ${ratio}% of your income this month, which is more than you bring in. It can help to look at which costs you might trim${topLabel ? ` \u2014 ${topLabel} is your largest at around ${topPct}%` : ""}.`;
  }

  let msg = `Your bills come to about ${ratio}% of your income this month, leaving roughly ${formatCurrency(safeToSpend)} over.`;
  if (topLabel) {
    msg += ` Your biggest cost is ${topLabel}, at about ${topPct}% of income.`;
  }
  return msg;
}
