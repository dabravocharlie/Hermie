import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// Account-level info: tutorial state, paid tier, manual bank balance, and reserve.
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT tutorial_seen, is_paid, bank_balance, bank_balance_updated_at, reserve_amount FROM users WHERE user_id = $1",
    [req.userId]
  );
  const r = rows[0] || {};
  res.json({
    tutorialSeen: r.tutorial_seen || false,
    isPaid: r.is_paid || false,
    bankBalance: r.bank_balance !== null && r.bank_balance !== undefined ? Number(r.bank_balance) : null,
    bankBalanceUpdatedAt: r.bank_balance_updated_at || null,
    reserveAmount: r.reserve_amount !== null && r.reserve_amount !== undefined ? Number(r.reserve_amount) : 0,
  });
});

// Mark the tutorial as seen (called when the user finishes or skips it).
router.post("/tutorial-seen", async (req, res) => {
  await pool.query("UPDATE users SET tutorial_seen = true WHERE user_id = $1", [req.userId]);
  res.status(204).end();
});

// Update the manually-entered bank balance (free-tier). Real bank connection
// is a separate future feature; this is a simple self-reported number.
router.put("/bank-balance", async (req, res) => {
  const { balance } = req.body;
  const val = Number(balance);
  if (Number.isNaN(val)) return res.status(400).json({ error: "A number is required" });
  const { rows } = await pool.query(
    `UPDATE users SET bank_balance = $1, bank_balance_updated_at = now()
     WHERE user_id = $2 RETURNING bank_balance, bank_balance_updated_at`,
    [val, req.userId]
  );
  res.json({
    bankBalance: Number(rows[0].bank_balance),
    bankBalanceUpdatedAt: rows[0].bank_balance_updated_at,
  });
});

// Update the reserve \u2014 a minimum balance the user wants to keep. One
// overall number, editable anytime from the app or by asking Hermie.
router.put("/reserve", async (req, res) => {
  const { amount } = req.body;
  const val = Number(amount);
  if (Number.isNaN(val) || val < 0) return res.status(400).json({ error: "A non-negative number is required" });
  const { rows } = await pool.query(
    "UPDATE users SET reserve_amount = $1 WHERE user_id = $2 RETURNING reserve_amount",
    [val, req.userId]
  );
  res.json({ reserveAmount: Number(rows[0].reserve_amount) });
});

export default router;
