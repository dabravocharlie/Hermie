import express from "express";
import { pool } from "../db.js";
import { getQuote, hasKey as hasFinnhub } from "../lib/finnhub.js";

const router = express.Router();

// --- Watchlist ---------------------------------------------------------
router.get("/watchlist", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM watchlist WHERE user_id = $1 ORDER BY symbol ASC",
    [req.userId]
  );
  if (!hasFinnhub()) return res.json({ pricesAvailable: false, items: rows });

  const items = await Promise.all(
    rows.map(async (w) => {
      try {
        const q = await getQuote(w.symbol);
        return { ...w, price: Number(q.c) || 0, changePct: Number(q.dp) || 0, priceOk: true };
      } catch {
        return { ...w, priceOk: false };
      }
    })
  );
  res.json({ pricesAvailable: true, items });
});

router.post("/watchlist", async (req, res) => {
  const { symbol } = req.body;
  if (!symbol || !symbol.trim()) return res.status(400).json({ error: "Symbol is required" });
  const sym = symbol.trim().toUpperCase();
  // Avoid duplicates for this user.
  const existing = await pool.query(
    "SELECT id FROM watchlist WHERE user_id = $1 AND symbol = $2",
    [req.userId, sym]
  );
  if (existing.rows.length) return res.json(existing.rows[0]);
  const { rows } = await pool.query(
    "INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2) RETURNING *",
    [req.userId, sym]
  );
  res.status(201).json(rows[0]);
});

router.delete("/watchlist/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM watchlist WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// --- Notes -------------------------------------------------------------
router.get("/notes", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM research_notes WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/notes", async (req, res) => {
  const { body, symbol } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: "Note is required" });
  const { rows } = await pool.query(
    `INSERT INTO research_notes (user_id, symbol, author, body)
     VALUES ($1, $2, 'user', $3) RETURNING *`,
    [req.userId, symbol ? symbol.trim().toUpperCase() : null, body.trim()]
  );
  res.status(201).json(rows[0]);
});

router.delete("/notes/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM research_notes WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
