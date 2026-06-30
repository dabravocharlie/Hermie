import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Render Postgres requires SSL. Locally you usually don't.
const useSSL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
