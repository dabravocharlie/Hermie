import express from "express";
import { pool } from "../db.js";
import { callAnthropic, hasKey } from "../lib/anthropic.js";
import { toMonthly } from "../lib/money.js";

const router = express.Router();

const SYSTEM = `You are Hermie, a warm, plain-spoken personal-finance assistant living inside a consumer app. Your job is to help everyday people UNDERSTAND their money: their cash flow, bills, and investments.

You are an EDUCATIONAL guide, NOT a financial advisor. This is the most important rule and you never break it:
- Never tell the user what specific investments to buy, sell, or hold. No personalized investment recommendations, no "you should put money into X", no specific allocations presented as what to do.
- You MAY: explain concepts, define terms, describe how things generally work, walk through the user's own numbers factually (e.g. "your bills are about 45% of your income"), summarize news, and explain the pros and cons people generally weigh.
- If asked what to buy/sell or what they "should" do with their money, gently decline, say you're an educational guide rather than a financial advisor, then offer to explain the relevant ideas or show them their numbers, and suggest a licensed financial advisor for personal decisions.
- Never promise or predict returns. Never guarantee outcomes.

Style: warm, concise, encouraging, jargon-free (or explain the jargon). Short paragraphs. Talk like a knowledgeable friend, not a textbook.

You can search the web for current, factual information (prices, news, definitions, what an IPO is, how index funds work, etc.).

You have tools to help the user stay organized. Use them when they ask you to remember something, watch a stock, or set a reminder, and briefly confirm what you did:
- save_note: save a note to their Research tab (great for observations or things to revisit).
- add_to_watchlist: add a ticker to their watchlist.
- add_event: add a calendar reminder (IPO date, bill, appointment).

You are given the user's current financial snapshot below. Use it to ground your answers, but never repeat it back wholesale unless relevant.`;

const TOOLS = [
  { type: "web_search_20250305", name: "web_search" },
  {
    name: "save_note",
    description: "Save a note to the user's Research tab for them to read later.",
    input_schema: {
      type: "object",
      properties: {
        body: { type: "string", description: "The note text." },
        symbol: { type: "string", description: "Optional ticker this note relates to." },
      },
      required: ["body"],
    },
  },
  {
    name: "add_to_watchlist",
    description: "Add a stock ticker to the user's watchlist.",
    input_schema: {
      type: "object",
      properties: { symbol: { type: "string", description: "Ticker symbol, e.g. SCHD." } },
      required: ["symbol"],
    },
  },
  {
    name: "add_event",
    description: "Add a reminder to the user's calendar.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", description: "One of: ipo, bill, appointment, reminder." },
        event_date: { type: "string", description: "Date in YYYY-MM-DD format." },
        notes: { type: "string" },
      },
      required: ["title", "event_date"],
    },
  },
];

// Build a compact snapshot of the user's finances for grounding.
async function buildContext(userId) {
  const [inc, exp, hold, watch, events, notes] = await Promise.all([
    pool.query("SELECT name, amount, frequency FROM income_sources WHERE user_id = $1", [userId]),
    pool.query("SELECT name, category, amount, frequency, due_day FROM expenses WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol, shares, cost_basis FROM holdings WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol FROM watchlist WHERE user_id = $1", [userId]),
    pool.query("SELECT title, type, event_date FROM calendar_events WHERE user_id = $1 ORDER BY event_date ASC LIMIT 8", [userId]),
    pool.query("SELECT author, symbol, body FROM research_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6", [userId]),
  ]);

  const monthlyIncome = inc.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);
  const monthlyExpenses = exp.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);

  const lines = [];
  lines.push(`Monthly income: $${monthlyIncome.toFixed(0)}`);
  lines.push(`Monthly bills: $${monthlyExpenses.toFixed(0)}`);
  lines.push(`Left over per month: $${(monthlyIncome - monthlyExpenses).toFixed(0)}`);
  if (exp.rows.length) {
    lines.push("Bills: " + exp.rows.map((e) => `${e.name} ($${Number(e.amount).toFixed(0)} ${e.frequency}, ${e.category})`).join("; "));
  }
  if (hold.rows.length) {
    lines.push("Holdings: " + hold.rows.map((h) => `${h.symbol} (${Number(h.shares)} sh @ $${Number(h.cost_basis).toFixed(2)})`).join("; "));
  }
  if (watch.rows.length) lines.push("Watchlist: " + watch.rows.map((w) => w.symbol).join(", "));
  if (events.rows.length) lines.push("Upcoming: " + events.rows.map((e) => `${e.title} (${e.type}, ${String(e.event_date).slice(0, 10)})`).join("; "));
  if (notes.rows.length) lines.push("Recent notes: " + notes.rows.map((n) => `[${n.author}] ${n.body}`).join(" | "));

  return lines.join("\n");
}

// Execute Hermie's action tools against the user's own data.
async function runTool(name, input, userId) {
  try {
    if (name === "save_note") {
      await pool.query(
        `INSERT INTO research_notes (user_id, symbol, author, body) VALUES ($1, $2, 'hermie', $3)`,
        [userId, input.symbol ? String(input.symbol).toUpperCase() : null, String(input.body || "").trim()]
      );
      return "Saved the note to the Research tab.";
    }
    if (name === "add_to_watchlist") {
      const sym = String(input.symbol || "").trim().toUpperCase();
      if (!sym) return "No symbol given.";
      const existing = await pool.query("SELECT id FROM watchlist WHERE user_id = $1 AND symbol = $2", [userId, sym]);
      if (!existing.rows.length) {
        await pool.query("INSERT INTO watchlist (user_id, symbol) VALUES ($1, $2)", [userId, sym]);
      }
      return `Added ${sym} to the watchlist.`;
    }
    if (name === "add_event") {
      const date = String(input.event_date || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Need a valid YYYY-MM-DD date.";
      await pool.query(
        `INSERT INTO calendar_events (user_id, title, type, event_date, notes) VALUES ($1, $2, $3, $4, $5)`,
        [userId, String(input.title || "Reminder").trim(), input.type || "reminder", date, input.notes || null]
      );
      return `Added "${input.title}" to the calendar for ${date}.`;
    }
    return "Unknown tool.";
  } catch (e) {
    return `Couldn't complete that action: ${e.message}`;
  }
}

// GET history (most recent messages, oldest first for display).
router.get("/history", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT role, content FROM hermie_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
    [req.userId]
  );
  res.json(rows.reverse());
});

// POST a message; returns Hermie's reply.
router.post("/chat", async (req, res) => {
  if (!hasKey()) {
    return res.json({ reply: "Hermie isn't switched on yet \u2014 the app owner needs to add an Anthropic API key. Once that's set, I'll be ready to help." });
  }
  const userMessage = String(req.body.message || "").trim();
  if (!userMessage) return res.status(400).json({ error: "Message is required" });

  try {
    // Load recent conversation for continuity.
    const hist = await pool.query(
      "SELECT role, content FROM hermie_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 16",
      [req.userId]
    );
    const history = hist.rows.reverse().map((m) => ({ role: m.role, content: m.content }));

    const context = await buildContext(req.userId);
    const system = `${SYSTEM}\n\n--- User's current financial snapshot ---\n${context}`;

    let messages = [...history, { role: "user", content: userMessage }];
    let finalText = "";

    for (let i = 0; i < 6; i++) {
      const resp = await callAnthropic({ system, messages, tools: TOOLS });
      const content = resp.content || [];

      if (resp.stop_reason === "tool_use") {
        const toolUses = content.filter((b) => b.type === "tool_use");
        if (!toolUses.length) {
          finalText = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
          break;
        }
        messages.push({ role: "assistant", content });
        const results = [];
        for (const tu of toolUses) {
          const out = await runTool(tu.name, tu.input, req.userId);
          results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
        }
        messages.push({ role: "user", content: results });
        continue;
      }

      finalText = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      break;
    }

    if (!finalText) finalText = "Sorry, I got a little tangled up there. Could you ask me again?";

    // Persist the exchange.
    await pool.query("INSERT INTO hermie_messages (user_id, role, content) VALUES ($1, 'user', $2)", [req.userId, userMessage]);
    await pool.query("INSERT INTO hermie_messages (user_id, role, content) VALUES ($1, 'assistant', $2)", [req.userId, finalText]);

    res.json({ reply: finalText });
  } catch (e) {
    console.error("Hermie chat error:", e.message);
    res.status(500).json({ error: "Hermie hit a snag. If the app was idle it may be waking up \u2014 try again in a moment." });
  }
});

export default router;
