import express from "express";
import { pool } from "../db.js";
import { markBillPaid, markBillUnpaid } from "../lib/bills.js";

const router = express.Router();

// List this user's expenses.
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

// Add an expense.
router.post("/", async (req, res) => {
  const { name, category, amount, frequency, due_day, autopay, next_date } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, name, category, amount, frequency, due_day, autopay, next_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.userId,
      name.trim(),
      category || "other",
      Number(amount) || 0,
      frequency || "monthly",
      due_day ? Number(due_day) : null,
      Boolean(autopay),
      next_date || null,
    ]
  );
  res.status(201).json(rows[0]);
});

// Update an expense.
router.put("/:id", async (req, res) => {
  const { name, category, amount, frequency, due_day, autopay, next_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE expenses
       SET name = $1, category = $2, amount = $3, frequency = $4, due_day = $5, autopay = $6, next_date = $7
     WHERE id = $8 AND user_id = $9 RETURNING *`,
    [
      name,
      category || "other",
      Number(amount) || 0,
      frequency || "monthly",
      due_day ? Number(due_day) : null,
      Boolean(autopay),
      next_date || null,
      req.params.id,
      req.userId,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Mark a bill paid for the current cycle. Optionally deducts its amount
// from a chosen bank account (account_id in the body) so the numbers stay
// honest without a separate manual balance update.
router.post("/:id/paid", async (req, res) => {
  const { account_id } = req.body;
  const result = await markBillPaid(pool, req.userId, req.params.id, account_id || null);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result.row);
});

// Undo: mark a bill unpaid, crediting back whichever account it was paid
// from (if any).
router.post("/:id/unpaid", async (req, res) => {
  const result = await markBillUnpaid(pool, req.userId, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result.row);
});

// Delete an expense.
router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
