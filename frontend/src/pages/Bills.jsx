import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import {
  toMonthly,
  formatCurrency,
  FREQUENCIES,
  freqShort,
  CATEGORIES,
  categoryMeta,
  budgetFit,
} from "../lib/money.js";
import { nextPayday } from "../lib/dates.js";

const input = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--divider)",
  background: "var(--card)", color: "var(--ink)", padding: "0 14px", fontSize: 15,
};
const labelText = { fontSize: 12, color: "var(--ink-soft)", marginBottom: 6, display: "block" };
const primaryBtn = { height: 44, borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500, flex: 1 };
const ghostBtn = { height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--ink-soft)", fontSize: 15, flex: 1 };

const CAT_KEYS = CATEGORIES.map((c) => c.key);

function SectionCard({ children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 18, boxShadow: "0 0 22px var(--violet-glow)" }}>
      {children}
    </div>
  );
}

function IncomeForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [frequency, setFrequency] = useState(initial?.frequency || "biweekly");
  const [payDate, setPayDate] = useState(initial?.next_date ? initial.next_date.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name, amount, frequency, next_date: payDate || null });
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
      <div>
        <label style={labelText}>Source</label>
        <input style={input} placeholder="e.g. Paycheck, Side gig" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelText}>Amount</label>
          <input style={input} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelText}>How often</label>
          <select style={input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelText}>Next payday (optional)</label>
        <input style={input} type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 5 }}>Set this to see your paydays on the calendar and home screen.</p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" style={ghostBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={primaryBtn} disabled={busy}>{busy ? "Saving..." : initial ? "Save changes" : "Save income"}</button>
      </div>
    </form>
  );
}

function ExpenseForm({ initial, onSave, onCancel }) {
  const initCustom = initial && !CAT_KEYS.includes(initial.category);
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial ? (initCustom ? "custom" : initial.category) : "housing");
  const [customLabel, setCustomLabel] = useState(initCustom ? initial.category : "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [frequency, setFrequency] = useState(initial?.frequency || "monthly");
  const [dueDay, setDueDay] = useState(initial?.due_day ? String(initial.due_day) : "");
  const [autopay, setAutopay] = useState(initial?.autopay || false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const cat = category === "custom" ? customLabel.trim() || "other" : category;
    setBusy(true);
    try {
      await onSave({ name, category: cat, amount, frequency, due_day: dueDay || null, autopay });
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
      <div>
        <label style={labelText}>Bill name</label>
        <input style={input} placeholder="e.g. Rent, Netflix, Car note" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label style={labelText}>Category</label>
        <select style={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          <option value="custom">+ Custom category</option>
        </select>
      </div>
      {category === "custom" && (
        <div>
          <label style={labelText}>Custom category name</label>
          <input style={input} placeholder="e.g. Pet care" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
        </div>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelText}>Amount</label>
          <input style={input} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelText}>How often</label>
          <select style={input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={labelText}>Due day (optional)</label>
          <input style={input} type="number" min="1" max="31" placeholder="e.g. 15" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
        <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 44, color: "var(--ink)", fontSize: 14 }}>
          <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--violet)" }} />
          On autopay
        </label>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" style={ghostBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={primaryBtn} disabled={busy}>{busy ? "Saving..." : initial ? "Save changes" : "Save bill"}</button>
      </div>
    </form>
  );
}

function WishForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [store, setStore] = useState(initial?.store || "");
  const [cost, setCost] = useState(initial ? String(initial.cost) : "");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name, store, cost });
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
      <div>
        <label style={labelText}>Item</label>
        <input style={input} placeholder="e.g. Noise-cancelling headphones" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label style={labelText}>Where to buy (optional)</label>
        <input style={input} placeholder="e.g. Best Buy, Amazon" value={store} onChange={(e) => setStore(e.target.value)} />
      </div>
      <div>
        <label style={labelText}>Cost</label>
        <input style={input} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" style={ghostBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={primaryBtn} disabled={busy}>{busy ? "Saving..." : initial ? "Save changes" : "Add to wishlist"}</button>
      </div>
    </form>
  );
}

function Row({ left, sub, amount, freq, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--divider)" }}>
      <button onClick={onEdit} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</p>
        {sub && <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</p>}
      </button>
      <button onClick={onEdit} style={{ textAlign: "right", background: "transparent", border: "none", cursor: "pointer" }}>
        <p className="mono" style={{ fontSize: 15, color: "var(--ink)" }}>{formatCurrency(amount, true)}</p>
        <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>{freqShort(freq)}</p>
      </button>
      <button onClick={onDelete} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, padding: "0 2px", lineHeight: 1 }}>{"\u00D7"}</button>
    </div>
  );
}

function WishRow({ item, fit, onEdit, onDelete }) {
  const dotColor = fit.status === "fits" ? "var(--green)" : fit.status === "save" ? "var(--violet)" : "var(--amber)";
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--divider)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onEdit} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
          {item.store && <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{item.store}</p>}
        </button>
        <button onClick={onEdit} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
          <p className="mono" style={{ fontSize: 15, color: "var(--ink)" }}>{formatCurrency(item.cost, true)}</p>
        </button>
        <button onClick={onDelete} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, padding: "0 2px", lineHeight: 1 }}>{"\u00D7"}</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingLeft: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: dotColor, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: dotColor, fontWeight: 500 }}>{fit.label}</p>
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2, paddingLeft: 13 }}>{fit.detail}</p>
    </div>
  );
}

function payText(i) {
  if (!i.next_date) return null;
  const d = nextPayday(i.next_date, i.frequency);
  return d ? "Next payday " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
}

export default function Bills() {
  const api = useApi();
  const [view, setView] = useState("budget");
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [incForm, setIncForm] = useState(null); // {mode:'new'} | {mode:'edit', item}
  const [expForm, setExpForm] = useState(null);
  const [wishForm, setWishForm] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const [inc, exp, wish] = await Promise.all([api.get("/api/income"), api.get("/api/expenses"), api.get("/api/wishlist")]);
      setIncome(inc);
      setExpenses(exp);
      setWishlist(wish);
      setErr("");
    } catch (e) {
      setErr("Couldn't load your data. If the app was idle it may be waking up \u2014 wait a few seconds and try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthlyIncome = useMemo(() => income.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0), [income]);
  const monthlyExpenses = useMemo(() => expenses.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0), [expenses]);
  const safe = monthlyIncome - monthlyExpenses;

  async function saveIncome(data) {
    if (incForm?.mode === "edit") await api.put(`/api/income/${incForm.item.id}`, data);
    else await api.post("/api/income", data);
    await load();
  }
  async function delIncome(id) {
    await api.del(`/api/income/${id}`);
    setIncome((p) => p.filter((r) => r.id !== id));
  }
  async function saveExpense(data) {
    if (expForm?.mode === "edit") await api.put(`/api/expenses/${expForm.item.id}`, data);
    else await api.post("/api/expenses", data);
    await load();
  }
  async function delExpense(id) {
    await api.del(`/api/expenses/${id}`);
    setExpenses((p) => p.filter((r) => r.id !== id));
  }
  async function saveWish(data) {
    if (wishForm?.mode === "edit") await api.put(`/api/wishlist/${wishForm.item.id}`, data);
    else await api.post("/api/wishlist", data);
    await load();
  }
  async function delWish(id) {
    await api.del(`/api/wishlist/${id}`);
    setWishlist((p) => p.filter((r) => r.id !== id));
  }

  const seg = (id, text) => (
    <button
      onClick={() => setView(id)}
      style={{
        flex: 1, height: 38, borderRadius: 10, border: "none", fontSize: 14, fontWeight: 500,
        background: view === id ? "var(--violet)" : "transparent",
        color: view === id ? "#fff" : "var(--ink-soft)",
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 4, background: "var(--track)", borderRadius: 12, padding: 4 }}>
        {seg("budget", "Budget")}
        {seg("wishlist", "Wishlist")}
      </div>

      {err && <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>{err}</p>}
      {loading && <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "0 4px" }}>Loading...</p>}

      {view === "budget" && (
        <>
          {/* Summary */}
          <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 20, boxShadow: "0 0 22px var(--violet-glow)" }}>
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Left to spend each month</p>
            <p className="mono glow-violet" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-1px", margin: "6px 0 0", color: safe >= 0 ? "var(--violet)" : "var(--amber)" }}>
              {formatCurrency(safe)}
            </p>
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>Income</p>
                <p className="mono" style={{ fontSize: 15, color: "var(--green)" }}>{formatCurrency(monthlyIncome)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>Bills</p>
                <p className="mono" style={{ fontSize: 15, color: "var(--ink)" }}>{formatCurrency(monthlyExpenses)}</p>
              </div>
            </div>
          </div>

          {/* Income */}
          <SectionCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Income</span>
              {!incForm && <button onClick={() => setIncForm({ mode: "new" })} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>}
            </div>
            {income.map((r) => (
              <Row key={r.id} left={r.name} sub={payText(r)} amount={r.amount} freq={r.frequency}
                onEdit={() => setIncForm({ mode: "edit", item: r })} onDelete={() => delIncome(r.id)} />
            ))}
            {!income.length && !incForm && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add your paychecks so Hermie knows what's coming in.</p>}
            {incForm && <IncomeForm initial={incForm.mode === "edit" ? incForm.item : null} onSave={saveIncome} onCancel={() => setIncForm(null)} />}
          </SectionCard>

          {/* Expenses */}
          <SectionCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Bills & expenses</span>
              {!expForm && <button onClick={() => setExpForm({ mode: "new" })} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>}
            </div>
            {expenses.map((r) => {
              const meta = categoryMeta(r.category);
              return (
                <Row key={r.id} left={`${meta.emoji}  ${r.name}`}
                  sub={meta.label + (r.due_day ? ` \u00B7 due the ${r.due_day}` : "") + (r.autopay ? " \u00B7 autopay" : "")}
                  amount={r.amount} freq={r.frequency}
                  onEdit={() => setExpForm({ mode: "edit", item: r })} onDelete={() => delExpense(r.id)} />
              );
            })}
            {!expenses.length && !expForm && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add rent, car, utilities, subscriptions \u2014 anything that goes out.</p>}
            {expForm && <ExpenseForm initial={expForm.mode === "edit" ? expForm.item : null} onSave={saveExpense} onCancel={() => setExpForm(null)} />}
          </SectionCard>

          <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", padding: "4px 20px" }}>
            Tap any row to edit it. Educational, not financial advice.
          </p>
        </>
      )}

      {view === "wishlist" && (
        <SectionCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Wishlist</span>
            {!wishForm && <button onClick={() => setWishForm({ mode: "new" })} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>Things you want to buy. Hermie shows how each fits your budget.</p>
          {wishlist.map((w) => (
            <WishRow key={w.id} item={w} fit={budgetFit(w.cost, safe)}
              onEdit={() => setWishForm({ mode: "edit", item: w })} onDelete={() => delWish(w.id)} />
          ))}
          {!wishlist.length && !wishForm && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add something you're saving up for, and see when it fits your budget.</p>}
          {wishForm && <WishForm initial={wishForm.mode === "edit" ? wishForm.item : null} onSave={saveWish} onCancel={() => setWishForm(null)} />}
          <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 14 }}>
            Based on your current budget, not a recommendation to spend. Educational, not financial advice.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
