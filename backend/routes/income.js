import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// List this user's income sources.
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM income_sources WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

// Add an income source.
router.post("/", async (req, res) => {
  const { name, amount, frequency, next_date } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const { rows } = await pool.query(
    `INSERT INTO income_sources (user_id, name, amount, frequency, next_date)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, name.trim(), Number(amount) || 0, frequency || "monthly", next_date || null]
  );
  res.status(201).json(rows[0]);
});

// Update an income source (scoped so users can only touch their own rows).
router.put("/:id", async (req, res) => {
  const { name, amount, frequency, next_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE income_sources
       SET name = $1, amount = $2, frequency = $3, next_date = $4
     WHERE id = $5 AND user_id = $6 RETURNING *`,
    [name, Number(amount) || 0, frequency || "monthly", next_date || null, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Delete an income source.
router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM income_sources WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
