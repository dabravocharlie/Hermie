import { pool } from "../db.js";

// Run with: npm run list-users
// Shows each account's user_id, last login, and current paid status, so you
// can find the right user_id to pass to "npm run set-paid".
// To match a user_id to a person's email, check the Clerk dashboard \u2014
// click a user there to see their User ID.

async function main() {
  const { rows } = await pool.query(
    "SELECT user_id, last_seen, is_paid, tutorial_seen FROM users ORDER BY last_seen DESC"
  );
  if (!rows.length) {
    console.log("No users yet.");
  } else {
    console.log("user_id".padEnd(36), "last_seen".padEnd(26), "is_paid");
    for (const r of rows) {
      console.log(
        String(r.user_id).padEnd(36),
        String(r.last_seen).padEnd(26),
        r.is_paid ? "YES" : "no"
      );
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error("list-users failed:", err);
  process.exit(1);
});
