import { pool } from "../db.js";

// Run with: npm run set-paid -- <user_id> <true|false>
// Example:  npm run set-paid -- user_2abc123XYZ true
// Find the user_id first with "npm run list-users".

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];
  const value = (args[1] || "true").toLowerCase() === "true";

  if (!userId) {
    console.error("Usage: npm run set-paid -- <user_id> <true|false>");
    process.exit(1);
  }

  const { rowCount } = await pool.query(
    "UPDATE users SET is_paid = $1 WHERE user_id = $2",
    [value, userId]
  );

  if (!rowCount) {
    console.error(`No user found with user_id "${userId}". Run "npm run list-users" to see valid ids.`);
  } else {
    console.log(`Set is_paid = ${value} for ${userId}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error("set-paid failed:", err);
  process.exit(1);
});
