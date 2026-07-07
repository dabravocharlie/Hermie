import express from "express";
import { pool } from "../db.js";

const router = express.Router();

// Whether this user has seen the welcome tutorial.
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT tutorial_seen FROM users WHERE user_id = $1", [req.userId]);
  res.json({ tutorialSeen: rows.length ? rows[0].tutorial_seen : false });
});

// Mark the tutorial as seen (called when the user finishes or skips it).
router.post("/tutorial-seen", async (req, res) => {
  await pool.query("UPDATE users SET tutorial_seen = true WHERE user_id = $1", [req.userId]);
  res.status(204).end();
});

export default router;
