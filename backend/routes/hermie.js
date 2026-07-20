import express from "express";
import { pool } from "../db.js";
import { callAnthropic, hasKey } from "../lib/anthropic.js";
import { toMonthly } from "../lib/money.js";

const router = express.Router();

const SYSTEM = `You are Hermie, a warm, plain-spoken personal-finance assistant living inside a consumer app. Your job is to help everyday people UNDERSTAND their money: their cash flow, bills, and investments.

You are an EDUCATIONAL guide, NOT a financial advisor. This is the most important rule and you never break it, regardless of the user's tier:
- Never tell the user what specific investments to buy, sell, or hold. No personalized investment recommendations, no "you should put money into X", no specific allocations presented as what to do.
- You MAY: explain concepts, define terms, describe how things generally work, walk through the user's own numbers factually (e.g. "your bills are about 45% of your income"), summarize news, and explain the pros and cons people generally weigh.
- If asked what to buy/sell or what they "should" do with their investments, gently decline, say you're an educational guide rather than a financial advisor, then offer to explain the relevant ideas or show them their numbers, and suggest a licensed financial advisor for personal investment decisions.
- Never promise or predict returns. Never guarantee outcomes.

Style: warm, concise, encouraging, jargon-free (or explain the jargon). Short paragraphs. Talk like a knowledgeable friend, not a textbook.

You can search the web for current, factual information (prices, news, definitions, what an IPO is, how index funds work, etc.).

You have tools to help the user stay organized. Use them when they ask you to remember something, watch a stock, or set a reminder, and briefly confirm what you did:
- save_note: save a note to their Research tab (great for observations or things to revisit).
- add_to_watchlist: add a ticker to their watchlist.
- add_event: add a calendar reminder (IPO date, bill, appointment).
- add_to_wishlist: add an item they want to purchase (not a stock) to their purchase wishlist.

The user's snapshot below may include one or more named bank accounts and a "Purchase wishlist" with a budget-fit note per item (whether it's already covered by their current bank balance, or roughly how long it'd take to save the remaining amount). If asked about timing a purchase, describe what the numbers show factually (e.g. "you've already got that covered" or "at your current pace you'd have the rest saved in about 2 months") rather than issuing a directive like "you should buy it now." This is budget math on their own numbers, not investment advice, but keep the same non-directive tone unless the user has premium access (see below).`;

const PREMIUM_ADDENDUM = `

--- Premium mode ---
This user has premium access. In addition to your usual role, you may give more direct and concrete BUDGETING, SAVINGS, and PURCHASE guidance grounded in their real numbers above \u2014 for example, specific suggestions like "you could trim about $60/month by cutting one streaming subscription" or "waiting about 3 weeks would let you buy this without dipping into next month's rent money." This is coaching on their own cash flow and spending choices, NOT investment or securities advice \u2014 the investing rules above still fully apply without exception. Present suggestions as options they can choose from, not commands. Stay warm and non-judgmental about their spending; you're a coach, not a critic.`;

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
  {
    name: "add_to_wishlist",
    description: "Add an item to the user's purchase wishlist (things they want to buy, not stocks).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The item name." },
        store: { type: "string", description: "Optional store or place to buy it." },
        cost: { type: "number", description: "Price of the item." },
        link: { type: "string", description: "Optional URL to the item's page." },
      },
      required: ["name", "cost"],
    },
  },
];

// Build a compact snapshot of the user's finances for grounding, plus
// whether they're on the paid tier (shapes the system prompt).
async function buildContext(userId) {
  const [inc, exp, hold, watch, events, notes, wish, acct, banks] = await Promise.all([
    pool.query("SELECT name, amount, frequency FROM income_sources WHERE user_id = $1", [userId]),
    pool.query("SELECT name, category, amount, frequency, due_day FROM expenses WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol, shares, cost_basis FROM holdings WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol FROM watchlist WHERE user_id = $1", [userId]),
    pool.query("SELECT title, type, event_date FROM calendar_events WHERE user_id = $1 ORDER BY event_date ASC LIMIT 8", [userId]),
    pool.query("SELECT author, symbol, body FROM research_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6", [userId]),
    pool.query("SELECT name, store, cost FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10", [userId]),
    pool.query("SELECT is_paid FROM users WHERE user_id = $1", [userId]),
    pool.query("SELECT name, balance FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC", [userId]),
  ]);

  const monthlyIncome = inc.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);
  const monthlyExpenses = exp.rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0);
  const monthlyLeft = monthlyIncome - monthlyExpenses;
  const isPaid = acct.rows[0]?.is_paid || false;
  const bankTotal = banks.rows.reduce((s, b) => s + Number(b.balance), 0);

  const lines = [];
  lines.push(`Monthly income: $${monthlyIncome.toFixed(0)}`);
  lines.push(`Monthly bills: $${monthlyExpenses.toFixed(0)}`);
  lines.push(`Left over per month: $${monthlyLeft.toFixed(0)}`);
  if (banks.rows.length) {
    lines.push("Bank accounts (self-reported): " + banks.rows.map((b) => `${b.name} $${Number(b.balance).toFixed(0)}`).join(", ") + ` \u2014 total $${bankTotal.toFixed(0)}`);
  }
  if (exp.rows.length) {
    lines.push("Bills: " + exp.rows.map((e) => `${e.name} ($${Number(e.amount).toFixed(0)} ${e.frequency}, ${e.category})`).join("; "));
  }
  if (hold.rows.length) {
    lines.push("Holdings: " + hold.rows.map((h) => `${h.symbol} (${Number(h.shares)} sh @ $${Number(h.cost_basis).toFixed(2)})`).join("; "));
  }
  if (watch.rows.length) lines.push("Watchlist: " + watch.rows.map((w) => w.symbol).join(", "));
  if (events.rows.length) lines.push("Upcoming: " + events.rows.map((e) => `${e.title} (${e.type}, ${String(e.event_date).slice(0, 10)})`).join("; "));
  if (notes.rows.length) lines.push("Recent notes: " + notes.rows.map((n) => `[${n.author}] ${n.body}`).join(" | "));
  if (wish.rows.length) {
    lines.push("Purchase wishlist: " + wish.rows.map((w) => {
      const cost = Number(w.cost) || 0;
      const remaining = cost - bankTotal;
      let fit;
      if (remaining <= 0) {
        fit = "already covered by current bank balance";
      } else if (monthlyLeft <= 0) {
        fit = "budget is tight right now, no monthly leftover to add toward it";
      } else {
        fit = `about ${Math.ceil(remaining / monthlyLeft)} months to save the remaining $${remaining.toFixed(0)} at current pace`;
      }
      return `${w.name}${w.store ? ` (${w.store})` : ""} $${cost.toFixed(0)} [${fit}]`;
    }).join("; "));
  }

  return { text: lines.join("\n"), isPaid };
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
    if (name === "add_to_wishlist") {
      const itemName = String(input.name || "").trim();
      if (!itemName) return "No item name given.";
      await pool.query(
        `INSERT INTO wishlist_items (user_id, name, store, cost, link) VALUES ($1, $2, $3, $4, $5)`,
        [userId, itemName, input.store ? String(input.store).trim() : null, Number(input.cost) || 0, input.link ? String(input.link).trim() : null]
      );
      return `Added "${itemName}" to the wishlist.`;
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

    const { text: context, isPaid } = await buildContext(req.userId);
    const system = `${SYSTEM}${isPaid ? PREMIUM_ADDENDUM : ""}\n\n--- User's current financial snapshot ---\n${context}`;

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
