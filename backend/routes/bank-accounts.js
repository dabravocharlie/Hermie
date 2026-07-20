import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// List this user's bank accounts. If they have none yet but had set a value
// under the old single-balance field, migrate it into one named account
// the first time this is called \u2014 so nothing is lost.
router.get("/", async (req, res) => {
  const existing = await pool.query(
    "SELECT id FROM bank_accounts WHERE user_id = $1 LIMIT 1",
    [req.userId]
  );
  if (!existing.rows.length) {
    const legacy = await pool.query(
      "SELECT bank_balance FROM users WHERE user_id = $1", [req.userId]
    );
    const oldVal = legacy.rows[0]?.bank_balance;
    if (oldVal !== null && oldVal !== undefined) {
      await pool.query(
        "INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, 'Bank account', $2)",
        [req.userId, oldVal]
      );
    }
  }
  const { rows } = await pool.query(
    "SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC",
    [req.userId]
  );
  res.json(rows);
});

// Add an account. Balance may be negative (overdrawn / credit-style account).
router.post("/", async (req, res) => {
  const { name, balance } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  const val = Number(balance);
  if (Number.isNaN(val)) return res.status(400).json({ error: "A number is required" });
  const { rows } = await pool.query(
    "INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, $2, $3) RETURNING *",
    [req.userId, name.trim(), val]
  );
  res.status(201).json(rows[0]);
});

// Update an account's name and/or balance.
router.put("/:id", async (req, res) => {
  const { name, balance } = req.body;
  const val = Number(balance);
  if (Number.isNaN(val)) return res.status(400).json({ error: "A number is required" });
  const { rows } = await pool.query(
    "UPDATE bank_accounts SET name = $1, balance = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
    [name, val, req.params.id, req.userId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
