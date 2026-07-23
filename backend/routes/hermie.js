import express from "express";
import { pool } from "../db.js";
import { callAnthropic, hasKey } from "../lib/anthropic.js";
import { actualMonthlyTotal, remainingMonthlyTotal } from "../lib/money.js";

const router = express.Router();

const SYSTEM = `You are Hermie, a warm, plain-spoken personal-finance assistant living inside a consumer app. Your job is to help everyday people UNDERSTAND their money: their cash flow, bills, and investments.

You are an EDUCATIONAL guide, NOT a financial advisor. This is the most important rule and you never break it, regardless of the user's tier:
- Never tell the user what specific investments to buy, sell, or hold. No personalized investment recommendations, no "you should put money into X", no specific allocations presented as what to do.
- You MAY: explain concepts, define terms, describe how things generally work, walk through the user's own numbers factually (e.g. "your bills are about 45% of your income"), summarize news, and explain the pros and cons people generally weigh.
- If asked what to buy/sell or what they "should" do with their investments, gently decline, say you're an educational guide rather than a financial advisor, then offer to explain the relevant ideas or show them their numbers, and suggest a licensed financial advisor for personal investment decisions.
- Never promise or predict returns. Never guarantee outcomes.

Style: warm, concise, encouraging, jargon-free (or explain the jargon). Short paragraphs. Talk like a knowledgeable friend, not a textbook.

You can search the web for current, factual information (prices, news, definitions, what an IPO is, how index funds work, etc.).

You have tools to help the user stay organized. Use them when they ask you to remember something, watch a stock, set a reminder, log a bill, or manage their wishlist, and briefly confirm what you did:
- save_note: save a note to their Research tab (great for observations or things to revisit).
- add_to_watchlist: add a ticker to their watchlist.
- add_event: add a calendar reminder (IPO date, bill, appointment).
- add_to_wishlist: add an item they want to purchase (not a stock) to their purchase wishlist.
- add_expense: add a new recurring bill (housing, transport, utilities, subscriptions, insurance, debt, food, or a short custom category).
- mark_bill_paid: mark an existing bill paid for the current cycle, matched by name (e.g. "I just paid rent").
- edit_wishlist_item, delete_wishlist_item, mark_wishlist_bought: manage an existing wishlist item, matched by name.
- set_reserve: update the minimum balance the user wants to always keep untouched (e.g. "keep at least $500 in my account").

Tools that match an existing bill or wishlist item by name (mark_bill_paid, edit_wishlist_item, delete_wishlist_item, mark_wishlist_bought) will tell you if the name is ambiguous or not found \u2014 relay that back to the user and ask them to clarify rather than guessing which one they meant.

The user's snapshot below may include one or more named bank accounts, a reserve amount they want to keep untouched, and a "Purchase wishlist" with a budget-fit note per item. That note already accounts for the reserve: an item can be "already covered," "would dip into the reserve" (they technically have the money, but spending it would drop them below the line they've asked to protect), or "needs more time to save." When an item would dip into the reserve, recommend waiting until the date given rather than suggesting they buy it now \u2014 that's the whole point of the reserve. Describe all of this factually (e.g. "that would dip into your reserve; waiting until around March would cover it without touching that buffer") rather than as a directive, and never override or second-guess the reserve the user has set.

If the user asks how much they can safely spend right now, always quote the "Safe to spend RIGHT NOW" figure given below directly \u2014 do not add the bank total and the monthly income together yourself. Income already received earlier this month is presumably already reflected in the bank total, so re-adding the full month's income on top of it would overstate what they actually have. The "Monthly income" and "Left over per month" figures are a separate, ongoing pacing rate (useful for wishlist savings timelines and general budgeting conversation) \u2014 not a live balance, and not interchangeable with the "right now" figure.`;

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
  {
    name: "add_expense",
    description: "Add a new recurring bill or expense.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The bill's name." },
        category: { type: "string", description: "One of: housing, transport, utilities, subscriptions, insurance, debt, food, other (or a short custom category)." },
        amount: { type: "number" },
        frequency: { type: "string", description: "One of: weekly, biweekly, monthly, once." },
        due_day: { type: "integer", description: "Optional day of month (1-31) it's due." },
        autopay: { type: "boolean", description: "Optional, whether it's on autopay." },
      },
      required: ["name", "amount"],
    },
  },
  {
    name: "mark_bill_paid",
    description: "Mark an existing bill as paid for the current cycle, matched by name.",
    input_schema: {
      type: "object",
      properties: { bill_name: { type: "string", description: "The bill's name, or a close match (e.g. 'electric')." } },
      required: ["bill_name"],
    },
  },
  {
    name: "edit_wishlist_item",
    description: "Edit an existing wishlist item's name, store, cost, or link, matched by its current name.",
    input_schema: {
      type: "object",
      properties: {
        item_name: { type: "string", description: "The current name of the item to edit." },
        new_name: { type: "string" },
        new_store: { type: "string" },
        new_cost: { type: "number" },
        new_link: { type: "string" },
      },
      required: ["item_name"],
    },
  },
  {
    name: "delete_wishlist_item",
    description: "Remove an item from the wishlist entirely, matched by name.",
    input_schema: {
      type: "object",
      properties: { item_name: { type: "string" } },
      required: ["item_name"],
    },
  },
  {
    name: "mark_wishlist_bought",
    description: "Mark a wishlist item as bought, removing it from the active wishlist without deleting its record.",
    input_schema: {
      type: "object",
      properties: { item_name: { type: "string" } },
      required: ["item_name"],
    },
  },
  {
    name: "set_reserve",
    description: "Set the minimum balance the user wants to always keep untouched across their bank accounts. Wishlist purchase timing will factor this in automatically.",
    input_schema: {
      type: "object",
      properties: { amount: { type: "number", description: "The reserve amount, e.g. 500." } },
      required: ["amount"],
    },
  },
];

// Build a compact snapshot of the user's finances for grounding, plus
// whether they're on the paid tier (shapes the system prompt).
async function buildContext(userId) {
  const [inc, exp, hold, watch, events, notes, wish, acct, banks] = await Promise.all([
    pool.query("SELECT name, amount, frequency, next_date FROM income_sources WHERE user_id = $1", [userId]),
    pool.query("SELECT name, category, amount, frequency, due_day, next_date FROM expenses WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol, shares, cost_basis FROM holdings WHERE user_id = $1", [userId]),
    pool.query("SELECT symbol FROM watchlist WHERE user_id = $1", [userId]),
    pool.query("SELECT title, type, event_date FROM calendar_events WHERE user_id = $1 ORDER BY event_date ASC LIMIT 8", [userId]),
    pool.query("SELECT author, symbol, body FROM research_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6", [userId]),
    pool.query("SELECT name, store, cost FROM wishlist_items WHERE user_id = $1 AND bought = false ORDER BY created_at DESC LIMIT 10", [userId]),
    pool.query("SELECT is_paid, reserve_amount FROM users WHERE user_id = $1", [userId]),
    pool.query("SELECT name, balance FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC", [userId]),
  ]);

  const monthlyIncome = actualMonthlyTotal(inc.rows);
  const monthlyExpenses = actualMonthlyTotal(exp.rows);
  const monthlyLeft = monthlyIncome - monthlyExpenses;
  const isPaid = acct.rows[0]?.is_paid || false;
  const reserve = Number(acct.rows[0]?.reserve_amount) || 0;
  const bankTotal = banks.rows.reduce((s, b) => s + Number(b.balance), 0);
  const available = Math.max(0, bankTotal - reserve);
  // "Right now" snapshot: only income that HASN'T arrived yet gets added to
  // the current bank total, so already-received pay isn't double counted.
  // Approximates bills as the full monthly total (the backend doesn't yet
  // track which specific bills are already paid this cycle the way the app
  // UI does), so this may run slightly conservative if some are paid.
  const incomeStillComing = remainingMonthlyTotal(inc.rows);
  const safeToSpendNow = bankTotal + incomeStillComing - monthlyExpenses - reserve;

  const lines = [];
  lines.push(`Monthly income (ongoing average, for pacing): $${monthlyIncome.toFixed(0)}`);
  lines.push(`Monthly bills (ongoing average, for pacing): $${monthlyExpenses.toFixed(0)}`);
  lines.push(`Left over per month (ongoing rate, NOT a live balance): $${monthlyLeft.toFixed(0)}`);
  lines.push(`Safe to spend RIGHT NOW (bank + income still coming this month - bills - reserve, matches the app's home screen): $${safeToSpendNow.toFixed(0)}`);
  if (banks.rows.length) {
    lines.push("Bank accounts (self-reported): " + banks.rows.map((b) => `${b.name} $${Number(b.balance).toFixed(0)}`).join(", ") + ` \u2014 total $${bankTotal.toFixed(0)}`);
  }
  if (reserve > 0) {
    lines.push(`Reserve the user wants to keep untouched: $${reserve.toFixed(0)} (leaves $${available.toFixed(0)} truly available)`);
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
      const remaining = cost - available;
      let fit;
      if (remaining <= 0) {
        fit = reserve > 0 ? "fits without touching the reserve" : "already covered by current bank balance";
      } else {
        const dippingIntoReserve = reserve > 0 && cost <= bankTotal;
        if (monthlyLeft <= 0) {
          fit = dippingIntoReserve
            ? "would dip into the reserve; no monthly leftover right now to close the gap"
            : "budget is tight right now, no monthly leftover to add toward it";
        } else {
          const months = Math.ceil(remaining / monthlyLeft);
          fit = dippingIntoReserve
            ? `would dip into the reserve if bought now; about ${months} months until it's covered without touching it`
            : `about ${months} months to save the remaining $${remaining.toFixed(0)} at current pace`;
        }
      }
      return `${w.name}${w.store ? ` (${w.store})` : ""} $${cost.toFixed(0)} [${fit}]`;
    }).join("; "));
  }

  return { text: lines.join("\n"), isPaid };
}

// Finds a single row by name for tools that take a spoken name instead of an
// id (e.g. "mark rent paid"). Prefers an exact case-insensitive match; falls
// back to a substring match. Returns an error string when the match is
// ambiguous or missing, so the caller can relay that back to the user
// instead of guessing which item they meant.
function fuzzyFindOne(rows, query, nameKey = "name") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { error: "No name given." };
  const exact = rows.filter((r) => String(r[nameKey]).toLowerCase() === q);
  if (exact.length === 1) return { row: exact[0] };
  if (exact.length > 1) {
    return { error: `Found more than one match: ${exact.map((r) => r[nameKey]).join(", ")}. Which one did you mean?` };
  }
  const partial = rows.filter((r) => String(r[nameKey]).toLowerCase().includes(q));
  if (partial.length === 1) return { row: partial[0] };
  if (partial.length > 1) {
    return { error: `Found more than one match: ${partial.map((r) => r[nameKey]).join(", ")}. Which one did you mean?` };
  }
  return { error: `Couldn't find anything named "${query}".` };
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
    if (name === "add_expense") {
      const nm = String(input.name || "").trim();
      if (!nm) return "No bill name given.";
      await pool.query(
        `INSERT INTO expenses (user_id, name, category, amount, frequency, due_day, autopay)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          nm,
          input.category || "other",
          Number(input.amount) || 0,
          input.frequency || "monthly",
          input.due_day ? Number(input.due_day) : null,
          Boolean(input.autopay),
        ]
      );
      return `Added "${nm}" as a ${input.frequency || "monthly"} bill.`;
    }
    if (name === "mark_bill_paid") {
      const { rows } = await pool.query("SELECT id, name FROM expenses WHERE user_id = $1", [userId]);
      const found = fuzzyFindOne(rows, input.bill_name);
      if (found.error) return found.error;
      await pool.query("UPDATE expenses SET paid_at = now() WHERE id = $1 AND user_id = $2", [found.row.id, userId]);
      return `Marked "${found.row.name}" as paid.`;
    }
    if (name === "edit_wishlist_item") {
      const { rows } = await pool.query("SELECT * FROM wishlist_items WHERE user_id = $1 AND bought = false", [userId]);
      const found = fuzzyFindOne(rows, input.item_name);
      if (found.error) return found.error;
      const cur = found.row;
      const newName = input.new_name ?? cur.name;
      const newStore = input.new_store !== undefined ? input.new_store : cur.store;
      const newCost = input.new_cost != null ? Number(input.new_cost) : Number(cur.cost);
      const newLink = input.new_link !== undefined ? input.new_link : cur.link;
      await pool.query(
        "UPDATE wishlist_items SET name = $1, store = $2, cost = $3, link = $4 WHERE id = $5 AND user_id = $6",
        [newName, newStore, newCost, newLink, cur.id, userId]
      );
      return `Updated "${cur.name}"${newName !== cur.name ? ` to "${newName}"` : ""}.`;
    }
    if (name === "delete_wishlist_item") {
      const { rows } = await pool.query("SELECT id, name FROM wishlist_items WHERE user_id = $1 AND bought = false", [userId]);
      const found = fuzzyFindOne(rows, input.item_name);
      if (found.error) return found.error;
      await pool.query("DELETE FROM wishlist_items WHERE id = $1 AND user_id = $2", [found.row.id, userId]);
      return `Removed "${found.row.name}" from the wishlist.`;
    }
    if (name === "mark_wishlist_bought") {
      const { rows } = await pool.query("SELECT id, name FROM wishlist_items WHERE user_id = $1 AND bought = false", [userId]);
      const found = fuzzyFindOne(rows, input.item_name);
      if (found.error) return found.error;
      await pool.query("UPDATE wishlist_items SET bought = true, bought_at = now() WHERE id = $1 AND user_id = $2", [found.row.id, userId]);
      return `Marked "${found.row.name}" as bought \u2014 nice! Moved it off the active wishlist.`;
    }
    if (name === "set_reserve") {
      const amt = Math.max(0, Number(input.amount) || 0);
      await pool.query("UPDATE users SET reserve_amount = $1 WHERE user_id = $2", [amt, userId]);
      return `Set your reserve to $${amt.toFixed(0)}. I'll factor that into wishlist timing from now on.`;
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
