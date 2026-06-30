import { getAuth } from "@clerk/express";
import { pool } from "../db.js";

// Requires a valid Clerk session. Puts the Clerk user id on req.userId.
// Every protected route uses this, then scopes its queries to req.userId.
export async function requireUser(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  req.userId = userId;

  // Keep a local record of the user (best-effort; never blocks the request).
  pool
    .query(
      `INSERT INTO users (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET last_seen = now()`,
      [userId]
    )
    .catch((err) => console.error("user upsert failed:", err.message));

  next();
}
