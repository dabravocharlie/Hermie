import express from "express";
import { pool } from "../db.js";
import { toMonthly } from "../lib/money.js";

const router = express.Router();

// Monthly cash-flow summary for the signed-in user. Powers the Bills page
// totals now, and the Dashboard "safe to spend" number in Phase 3.
router.get("/", async (req, res) => {
  const [inc, exp] = await Promise.all([
    pool.query("SELECT amount, frequency FROM income_sources WHERE user_id = $1", [req.userId]),
    pool.query("SELECT amount, frequency, category FROM expenses WHERE user_id = $1", [req.userId]),
  ]);

  const monthlyIncome = inc.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);
  const monthlyExpenses = exp.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);

  // Spend by category (monthly), useful for later breakdowns.
  const byCategory = {};
  for (const r of exp.rows) {
    const key = r.category || "other";
    byCategory[key] = (byCategory[key] || 0) + toMonthly(r.amount, r.frequency);
  }

  res.json({
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    safeToSpend: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
    incomeCount: inc.rows.length,
    expenseCount: exp.rows.length,
    byCategory,
  });
});

export default router;
