import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM holdings WHERE user_id = $1 ORDER BY symbol ASC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { symbol, shares, cost_basis } = req.body;
  if (!symbol || !symbol.trim()) return res.status(400).json({ error: "Symbol is required" });
  const { rows } = await pool.query(
    `INSERT INTO holdings (user_id, symbol, shares, cost_basis)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.userId, symbol.trim().toUpperCase(), Number(shares) || 0, Number(cost_basis) || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { symbol, shares, cost_basis } = req.body;
  const { rows } = await pool.query(
    `UPDATE holdings SET symbol = $1, shares = $2, cost_basis = $3
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [symbol.trim().toUpperCase(), Number(shares) || 0, Number(cost_basis) || 0, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM holdings WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
