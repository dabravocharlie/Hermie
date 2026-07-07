import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import { formatCurrency } from "../lib/money.js";
import { upcomingBills, upcomingPaydays, parseDateLocal, daysUntil, whenLabel } from "../lib/dates.js";

const input = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--divider)",
  background: "var(--card)", color: "var(--ink)", padding: "0 14px", fontSize: 15,
};
const label = { fontSize: 12, color: "var(--ink-soft)", marginBottom: 6, display: "block" };

const TYPES = [
  { key: "ipo", label: "IPO", emoji: "\u{1F680}" },
  { key: "bill", label: "Bill", emoji: "\u{1F4B3}" },
  { key: "appointment", label: "Appointment", emoji: "\u{1F4C5}" },
  { key: "reminder", label: "Reminder", emoji: "\u{1F514}" },
];
function typeMeta(key) {
  return TYPES.find((t) => t.key === key) || TYPES[3];
}

function fmtDate(d) {
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}

function AddForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("reminder");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      await onSave({ title, type, event_date: date, notes });
      onCancel();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
      <div>
        <label style={label}>What is it</label>
        <input style={input} placeholder="e.g. Reddit IPO, Rent due, Dentist" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Type</label>
          <select style={input} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Date</label>
          <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label style={label}>Notes (optional)</label>
        <input style={input} placeholder="Anything to remember" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--ink-soft)", fontSize: 15 }}>Cancel</button>
        <button type="submit" disabled={busy} style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}>{busy ? "Saving..." : "Add event"}</button>
      </div>
    </form>
  );
}

export default function Calendar() {
  const api = useApi();
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [ev, exp, inc] = await Promise.all([api.get("/api/events"), api.get("/api/expenses"), api.get("/api/income")]);
      setEvents(ev);
      setExpenses(exp);
      setIncome(inc);
      setErr("");
    } catch (e) {
      setErr("Couldn't load your calendar. If the app was idle it may be waking up.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEvent(d) {
    await api.post("/api/events", d);
    await load();
  }
  async function delEvent(id) {
    await api.del(`/api/events/${id}`);
    setEvents((p) => p.filter((e) => e.id !== id));
  }

  // Merge manual events with auto bill due-dates and paydays into one agenda.
  const items = useMemo(() => {
    const manual = events.map((e) => {
      const date = parseDateLocal(e.event_date);
      return { key: `e${e.id}`, id: e.id, title: e.title, type: e.type, notes: e.notes, date, days: daysUntil(date), manual: true };
    });
    const bills = upcomingBills(expenses).map((b) => ({
      key: `b${b.id}`, title: `${b.name} due`, type: "bill", date: b.dueDate, days: b.days, amount: b.amount, manual: false, source: "Bills",
    }));
    const pay = upcomingPaydays(income).map((p) => ({
      key: `p${p.id}`, title: `${p.name}`, type: "income", emoji: "\u{1F4B5}", date: p.payDate, days: p.days, amount: p.amount, manual: false, source: "Income",
    }));
    return [...manual, ...bills, ...pay].filter((i) => i.days >= 0).sort((a, b) => a.days - b.days);
  }, [events, expenses, income]);

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Upcoming</span>
        {!showAdd && <button onClick={() => setShowAdd(true)} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add event</button>}
      </div>

      {showAdd && (
        <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 18, boxShadow: "0 0 22px var(--violet-glow)" }}>
          <AddForm onSave={addEvent} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {err && <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>{err}</p>}
      {loading && <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "0 4px" }}>Loading...</p>}

      <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: "6px 18px 10px", boxShadow: "0 0 22px var(--violet-glow)" }}>
        {items.map((it) => {
          const emoji = it.emoji || typeMeta(it.type).emoji;
          const soon = it.days <= 3;
          const isIncome = it.type === "income";
          return (
            <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--divider)" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--hcard-bg)", border: "1px solid var(--hcard-bd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</p>
                <p style={{ fontSize: 12, color: soon ? "var(--amber)" : "var(--ink-soft)", marginTop: 1 }}>
                  {fmtDate(it.date)} &middot; {whenLabel(it.days)}{!it.manual ? ` \u00B7 from ${it.source}` : ""}{it.amount ? ` \u00B7 ${formatCurrency(it.amount, true)}` : ""}
                </p>
              </div>
              {it.manual ? (
                <button onClick={() => delEvent(it.id)} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, lineHeight: 1 }}>{"\u00D7"}</button>
              ) : (
                <span style={{ fontSize: 10, color: isIncome ? "var(--green)" : "var(--ink-soft)", border: `1px solid ${isIncome ? "var(--green-soft)" : "var(--divider)"}`, borderRadius: 6, padding: "2px 6px" }}>auto</span>
              )}
            </div>
          );
        })}
        {!items.length && !loading && (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "14px 0" }}>
            Nothing coming up. Add an IPO date, an appointment, or a reminder \u2014 bill due dates from your Bills tab show up here automatically.
          </p>
        )}
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", padding: "4px 20px" }}>
        Bill due dates are pulled from your Bills tab. Educational, not financial advice.
      </p>
    </div>
  );
}
