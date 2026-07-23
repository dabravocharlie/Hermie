import express from "express";
import { pool } from "../db.js";
import { actualMonthlyTotal } from "../lib/money.js";

const router = express.Router();

// Monthly cash-flow summary for the signed-in user, using the REAL total
// for the current calendar month (not a smoothed annualized average) \u2014
// so this agrees with what the app shows elsewhere.
router.get("/", async (req, res) => {
  const [inc, exp] = await Promise.all([
    pool.query("SELECT amount, frequency, next_date FROM income_sources WHERE user_id = $1", [req.userId]),
    pool.query("SELECT amount, frequency, category, next_date FROM expenses WHERE user_id = $1", [req.userId]),
  ]);

  const monthlyIncome = actualMonthlyTotal(inc.rows);
  const monthlyExpenses = actualMonthlyTotal(exp.rows);

  // Spend by category (this month, real totals), useful for later breakdowns.
  const byCategory = {};
  for (const r of exp.rows) {
    const key = r.category || "other";
    byCategory[key] = (byCategory[key] || 0) + (actualMonthlyTotal([r]));
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
