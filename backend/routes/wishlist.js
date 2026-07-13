import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, store, cost } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const { rows } = await pool.query(
    `INSERT INTO wishlist_items (user_id, name, store, cost) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.userId, name.trim(), store ? store.trim() : null, Number(cost) || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, store, cost } = req.body;
  const { rows } = await pool.query(
    `UPDATE wishlist_items SET name = $1, store = $2, cost = $3
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [name, store ? store.trim() : null, Number(cost) || 0, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM wishlist_items WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
