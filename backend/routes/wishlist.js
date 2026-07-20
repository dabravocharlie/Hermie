import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM wishlist_items WHERE user_id = $1 AND bought = false ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, store, cost, link } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const { rows } = await pool.query(
    `INSERT INTO wishlist_items (user_id, name, store, cost, link) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, name.trim(), store ? store.trim() : null, Number(cost) || 0, link ? link.trim() : null]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, store, cost, link } = req.body;
  const { rows } = await pool.query(
    `UPDATE wishlist_items SET name = $1, store = $2, cost = $3, link = $4
     WHERE id = $5 AND user_id = $6 RETURNING *`,
    [name, store ? store.trim() : null, Number(cost) || 0, link ? link.trim() : null, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Mark that this item has been added to the Calendar (so the UI can show it
// as done rather than letting someone add the same reminder repeatedly).
router.post("/:id/calendar-added", async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE wishlist_items SET added_to_calendar = true WHERE id = $1 AND user_id = $2 RETURNING *",
    [req.params.id, req.userId]
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
