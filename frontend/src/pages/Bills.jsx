import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import {
  toMonthly,
  formatCurrency,
  FREQUENCIES,
  freqShort,
  CATEGORIES,
  categoryMeta,
} from "../lib/money.js";

const input = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--divider)",
  background: "var(--card)",
  color: "var(--ink)",
  padding: "0 14px",
  fontSize: 15,
};
const labelText = { fontSize: 12, color: "var(--ink-soft)", marginBottom: 6, display: "block" };
const primaryBtn = {
  height: 44,
  borderRadius: 12,
  border: "none",
  background: "var(--violet)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 500,
  flex: 1,
};
const ghostBtn = {
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--divider)",
  background: "transparent",
  color: "var(--ink-soft)",
  fontSize: 15,
  flex: 1,
};

function SectionCard({ children }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-bd)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 0 22px var(--violet-glow)",
      }}
    >
      {children}
    </div>
  );
}

function IncomeForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("biweekly");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name, amount, frequency });
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
            {FREQUENCIES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" style={ghostBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={primaryBtn} disabled={busy}>{busy ? "Saving..." : "Save income"}</button>
      </div>
    </form>
  );
}

function ExpenseForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("housing");
  const [customLabel, setCustomLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dueDay, setDueDay] = useState("");
  const [autopay, setAutopay] = useState(false);
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
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
          ))}
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
            {FREQUENCIES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
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
        <button type="submit" style={primaryBtn} disabled={busy}>{busy ? "Saving..." : "Save bill"}</button>
      </div>
    </form>
  );
}

function Row({ left, sub, amount, freq, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--divider)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</p>
        {sub && <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</p>}
      </div>
      <div style={{ textAlign: "right" }}>
        <p className="mono" style={{ fontSize: 15, color: "var(--ink)" }}>{formatCurrency(amount, true)}</p>
        <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>{freqShort(freq)}</p>
      </div>
      <button onClick={onDelete} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, padding: "0 2px", lineHeight: 1 }}>{"\u00D7"}</button>
    </div>
  );
}

export default function Bills() {
  const api = useApi();
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [inc, exp] = await Promise.all([api.get("/api/income"), api.get("/api/expenses")]);
      setIncome(inc);
      setExpenses(exp);
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

  async function addIncome(data) {
    const row = await api.post("/api/income", data);
    setIncome((p) => [row, ...p]);
  }
  async function delIncome(id) {
    await api.del(`/api/income/${id}`);
    setIncome((p) => p.filter((r) => r.id !== id));
  }
  async function addExpense(data) {
    const row = await api.post("/api/expenses", data);
    setExpenses((p) => [row, ...p]);
  }
  async function delExpense(id) {
    await api.del(`/api/expenses/${id}`);
    setExpenses((p) => p.filter((r) => r.id !== id));
  }

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
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

      {err && <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>{err}</p>}
      {loading && <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "0 4px" }}>Loading...</p>}

      {/* Income */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Income</span>
          {!showIncome && (
            <button onClick={() => setShowIncome(true)} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>
          )}
        </div>
        {income.map((r) => (
          <Row key={r.id} left={r.name} amount={r.amount} freq={r.frequency} onDelete={() => delIncome(r.id)} />
        ))}
        {!income.length && !showIncome && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add your paychecks so Hermie knows what's coming in.</p>}
        {showIncome && <IncomeForm onSave={addIncome} onCancel={() => setShowIncome(false)} />}
      </SectionCard>

      {/* Expenses */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Bills & expenses</span>
          {!showExpense && (
            <button onClick={() => setShowExpense(true)} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>
          )}
        </div>
        {expenses.map((r) => {
          const meta = categoryMeta(r.category);
          return (
            <Row
              key={r.id}
              left={`${meta.emoji}  ${r.name}`}
              sub={meta.label + (r.due_day ? ` \u00B7 due the ${r.due_day}` : "") + (r.autopay ? " \u00B7 autopay" : "")}
              amount={r.amount}
              freq={r.frequency}
              onDelete={() => delExpense(r.id)}
            />
          );
        })}
        {!expenses.length && !showExpense && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add rent, car, utilities, subscriptions \u2014 anything that goes out.</p>}
        {showExpense && <ExpenseForm onSave={addExpense} onCancel={() => setShowExpense(false)} />}
      </SectionCard>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", padding: "4px 20px" }}>
        Hermie uses these numbers to explain your cash flow. Educational, not financial advice.
      </p>
    </div>
  );
}
