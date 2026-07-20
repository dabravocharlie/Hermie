import express from "express";
import { pool } from "../db.js";

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
  const { name, category, amount, frequency, due_day, autopay } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const { rows } = await pool.query(
    `INSERT INTO expenses (user_id, name, category, amount, frequency, due_day, autopay)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      req.userId,
      name.trim(),
      category || "other",
      Number(amount) || 0,
      frequency || "monthly",
      due_day ? Number(due_day) : null,
      Boolean(autopay),
    ]
  );
  res.status(201).json(rows[0]);
});

// Update an expense.
router.put("/:id", async (req, res) => {
  const { name, category, amount, frequency, due_day, autopay } = req.body;
  const { rows } = await pool.query(
    `UPDATE expenses
       SET name = $1, category = $2, amount = $3, frequency = $4, due_day = $5, autopay = $6
     WHERE id = $7 AND user_id = $8 RETURNING *`,
    [
      name,
      category || "other",
      Number(amount) || 0,
      frequency || "monthly",
      due_day ? Number(due_day) : null,
      Boolean(autopay),
      req.params.id,
      req.userId,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Mark a bill paid (for the current cycle). Frontend decides when a bill's
// paid state should be treated as stale for a new cycle \u2014 see
// lib/dates.js lastDueOnOrBefore() \u2014 this endpoint just records the timestamp.
router.post("/:id/paid", async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE expenses SET paid_at = now() WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Undo: mark a bill unpaid.
router.post("/:id/unpaid", async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE expenses SET paid_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
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
