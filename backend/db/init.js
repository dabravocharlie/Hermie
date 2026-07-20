import { pool } from "../db.js";

// Idempotent schema. Safe to run repeatedly (CREATE TABLE IF NOT EXISTS /
// ADD COLUMN IF NOT EXISTS). Run with:  npm run db:init
//
// IMPORTANT: every table carries a user_id (the Clerk user id, a string like
// "user_2abc..."). Every query in the app MUST filter by user_id so one
// person can never see another person's financial data.

const statements = [
  // A light mirror of the Clerk user. Clerk is the source of truth for auth;
  // we keep a row here so we have a local record + created_at per user.
  `CREATE TABLE IF NOT EXISTS users (
    user_id      TEXT PRIMARY KEY,
    email        TEXT,
    first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Whether the user has seen the welcome tutorial (follows them across devices).
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_seen BOOLEAN NOT NULL DEFAULT false`,

  // Internal paid-tier flag. No billing system yet \u2014 set manually for now
  // via "npm run set-paid" (see db/set-paid.js). Real billing wires into this
  // same column later.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false`,

  // Manually-entered bank balance (free-tier). Paid tier will eventually
  // offer a real bank connection as its own separate feature.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_balance NUMERIC(12,2)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_balance_updated_at TIMESTAMPTZ`,

  // Income: how much, how often, when next paid.
  `CREATE TABLE IF NOT EXISTS income_sources (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    frequency    TEXT NOT NULL DEFAULT 'monthly',  -- weekly | biweekly | monthly
    next_date    DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Recurring bills / subscriptions / one-off expenses.
  `CREATE TABLE IF NOT EXISTS expenses (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT 'other',    -- housing | transport | utilities | subscriptions | debt | other
    amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    frequency    TEXT NOT NULL DEFAULT 'monthly',  -- weekly | biweekly | monthly | once
    due_day      INTEGER,                           -- day of month 1-31 when applicable
    autopay      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // When the bill was last marked paid. Compared against the current billing
  // cycle (derived from due_day) to auto-reset each cycle \u2014 see
  // frontend lib/dates.js lastDueOnOrBefore().
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,

  // Portfolio holdings (things the user owns).
  `CREATE TABLE IF NOT EXISTS holdings (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    symbol       TEXT NOT NULL,
    shares       NUMERIC(16,4) NOT NULL DEFAULT 0,
    cost_basis   NUMERIC(12,2) NOT NULL DEFAULT 0, -- average cost per share
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Watchlist (things the user is researching, not necessarily owned).
  `CREATE TABLE IF NOT EXISTS watchlist (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    symbol       TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Research notes. author = 'user' or 'hermie'. symbol optional (general notes).
  `CREATE TABLE IF NOT EXISTS research_notes (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    symbol       TEXT,
    author       TEXT NOT NULL DEFAULT 'user',     -- user | hermie
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Calendar events: IPO reminders, bill pay reminders, appointments.
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    title        TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'reminder',  -- ipo | bill | appointment | reminder
    event_date   DATE NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Purchase wishlist: things the user wants to buy (distinct from the stock watchlist).
  `CREATE TABLE IF NOT EXISTS wishlist_items (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    store        TEXT,
    cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Link to the item's page, and whether it's already been added to the Calendar.
  `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS link TEXT`,
  `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS added_to_calendar BOOLEAN NOT NULL DEFAULT false`,

  // Hermie conversation memory (per user). role = 'user' | 'assistant'.
  `CREATE TABLE IF NOT EXISTS hermie_messages (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    role         TEXT NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Helpful indexes for per-user lookups.
  `CREATE INDEX IF NOT EXISTS idx_income_user      ON income_sources(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_user    ON expenses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_holdings_user    ON holdings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_watchlist_user   ON watchlist(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_user       ON research_notes(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_user      ON calendar_events(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wishlist_user    ON wishlist_items(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user    ON hermie_messages(user_id, created_at)`,
];

async function init() {
  console.log("Initializing Hermie database schema...");
  for (const sql of statements) {
    await pool.query(sql);
  }
  console.log("Schema ready. All tables created or already present.");
  await pool.end();
}

init().catch((err) => {
  console.error("db:init failed:", err);
  process.exit(1);
});
