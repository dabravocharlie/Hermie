import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import Wings from "../components/Wings.jsx";
import { formatCurrency, categoryMeta } from "../lib/money.js";
import { upcomingBills, dueLabel } from "../lib/dates.js";
import { buildInsight } from "../lib/insight.js";

export default function Dashboard() {
  const api = useApi();
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [sum, exp] = await Promise.all([api.get("/api/summary"), api.get("/api/expenses")]);
      setSummary(sum);
      setExpenses(exp);
      setErr("");
    } catch (e) {
      setErr("Couldn't reach your data. If the app was idle it may be waking up.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const income = summary?.monthlyIncome || 0;
  const bills = summary?.monthlyExpenses || 0;
  const safe = summary?.safeToSpend || 0;
  const committedPct = income > 0 ? Math.min(100, Math.round((bills / income) * 100)) : 0;

  const upcoming = useMemo(() => upcomingBills(expenses), [expenses]);
  const thisWeek = useMemo(() => upcoming.filter((b) => b.days >= 0 && b.days <= 7), [upcoming]);
  const weekSum = useMemo(() => thisWeek.reduce((s, b) => s + (Number(b.amount) || 0), 0), [thisWeek]);
  const insight = buildInsight(summary || {});

  if (err) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-soft)" }}>
        <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{err}</p>
        <button
          onClick={load}
          style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Hero */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 20, boxShadow: "0 0 24px var(--violet-glow)" }}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Safe to spend this month</p>
        <p className="mono glow-violet" style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-1px", margin: "8px 0 0", color: safe >= 0 ? "var(--violet)" : "var(--amber)" }}>
          {loading && !summary ? "\u2014" : formatCurrency(safe)}
        </p>
        <div style={{ marginTop: 16, height: 8, background: "var(--track)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${committedPct}%`, background: "var(--violet)", boxShadow: "0 0 8px var(--violet-soft)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--ink-soft)" }}>
          <span><span style={{ color: "var(--violet)" }}>&#9679;</span> Bills {formatCurrency(bills)}</span>
          <span><span style={{ color: "var(--green)" }}>&#9679;</span> Income {formatCurrency(income)}</span>
        </div>
      </div>

      {/* Tiles */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 18, padding: "14px 16px", boxShadow: "0 0 16px var(--violet-glow)" }}>
          <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Bills this week</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 0", color: "var(--ink)" }}>{thisWeek.length}</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{formatCurrency(weekSum)} due</p>
        </div>
        <div style={{ flex: 1, background: "var(--card)", border: "1px solid var(--green-soft)", borderRadius: 18, padding: "14px 16px", boxShadow: "0 0 16px var(--green-soft)" }}>
          <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>Portfolio today</p>
          <p className="mono" style={{ fontSize: 22, fontWeight: 500, margin: "6px 0 0", color: "var(--green)" }}>{"\u2014"}</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>Set up in Portfolio</p>
        </div>
      </div>

      {/* Hermie insight */}
      <div style={{ background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", borderRadius: 20, padding: "16px 18px", boxShadow: "0 0 22px var(--violet-glow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--violet)" }}>
          <Wings size={24} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--hname)", fontFamily: "var(--font-display)" }}>Hermie</span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--htext)" }}>{insight}</p>
        <p style={{ fontSize: 11, color: "var(--hdisc)", marginTop: 10 }}>Educational, not financial advice</p>
      </div>

      {/* Coming up */}
      <div style={{ margin: "6px 6px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-display)" }}>Coming up</span>
      </div>
      <div>
        {upcoming.slice(0, 4).map((b) => {
          const meta = categoryMeta(b.category);
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: "1px solid var(--divider)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{meta.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</p>
                <p style={{ fontSize: 12, color: b.days <= 3 ? "var(--amber)" : "var(--ink-soft)", marginTop: 1 }}>{dueLabel(b.days)}</p>
              </div>
              <span className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>{formatCurrency(b.amount, true)}</span>
            </div>
          );
        })}
        {!upcoming.length && (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "12px 4px" }}>
            Nothing scheduled yet. Add a due day to your bills in the Bills tab and they'll show up here with a countdown.
          </p>
        )}
      </div>
    </div>
  );
}
