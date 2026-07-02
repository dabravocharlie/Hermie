import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY event_date ASC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { title, type, event_date, notes } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  if (!event_date) return res.status(400).json({ error: "Date is required" });
  const { rows } = await pool.query(
    `INSERT INTO calendar_events (user_id, title, type, event_date, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, title.trim(), type || "reminder", event_date, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { title, type, event_date, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE calendar_events SET title = $1, type = $2, event_date = $3, notes = $4
     WHERE id = $5 AND user_id = $6 RETURNING *`,
    [title, type || "reminder", event_date, notes || null, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM calendar_events WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
