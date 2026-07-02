import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import { formatCurrency } from "../lib/money.js";
import Wings from "../components/Wings.jsx";

const input = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--divider)",
  background: "var(--card)", color: "var(--ink)", padding: "0 14px", fontSize: 15,
};

function gainColor(n) {
  if (n > 0) return "var(--green)";
  if (n < 0) return "var(--amber)";
  return "var(--ink-soft)";
}

export default function Research() {
  const api = useApi();
  const [wl, setWl] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sym, setSym] = useState("");
  const [noteText, setNoteText] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [w, n] = await Promise.all([api.get("/api/research/watchlist"), api.get("/api/research/notes")]);
      setWl(w);
      setNotes(n);
      setErr("");
    } catch (e) {
      setErr("Couldn't load your research. If the app was idle it may be waking up.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSymbol(e) {
    e.preventDefault();
    if (!sym.trim()) return;
    await api.post("/api/research/watchlist", { symbol: sym });
    setSym("");
    await load();
  }
  async function delSymbol(id) {
    await api.del(`/api/research/watchlist/${id}`);
    await load();
  }
  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    const row = await api.post("/api/research/notes", { body: noteText });
    setNotes((p) => [row, ...p]);
    setNoteText("");
  }
  async function delNote(id) {
    await api.del(`/api/research/notes/${id}`);
    setNotes((p) => p.filter((n) => n.id !== id));
  }

  const items = wl?.items || [];

  return (
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {err && <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>{err}</p>}

      {/* Watchlist */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 18, boxShadow: "0 0 22px var(--violet-glow)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Watchlist</span>
        <form onSubmit={addSymbol} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input style={{ ...input, flex: 1 }} placeholder="Add a ticker, e.g. NVDA" value={sym} onChange={(e) => setSym(e.target.value)} />
          <button type="submit" style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}>Add</button>
        </form>
        <div style={{ marginTop: 6 }}>
          {items.map((w) => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--divider)" }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{w.symbol}</span>
              {w.priceOk ? (
                <div style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>{formatCurrency(w.price, true)}</span>
                  <span className="mono" style={{ fontSize: 12, color: gainColor(w.changePct), marginLeft: 8 }}>{w.changePct >= 0 ? "+" : ""}{Number(w.changePct).toFixed(1)}%</span>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{wl && wl.pricesAvailable === false ? "" : "price n/a"}</span>
              )}
              <button onClick={() => delSymbol(w.id)} aria-label="Remove" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, lineHeight: 1 }}>{"\u00D7"}</button>
            </div>
          ))}
          {!items.length && !loading && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add tickers you want to keep an eye on.</p>}
        </div>
      </div>

      {/* Notes */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 18, boxShadow: "0 0 22px var(--violet-glow)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Notes</span>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>Yours and Hermie's, in one place.</p>
        <form onSubmit={addNote} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input style={{ ...input, flex: 1 }} placeholder="Jot a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button type="submit" style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}>Save</button>
        </form>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.map((n) => {
            const isHermie = n.author === "hermie";
            return (
              <div key={n.id} style={{ background: isHermie ? "var(--hcard-bg)" : "transparent", border: `1px solid ${isHermie ? "var(--hcard-bd)" : "var(--divider)"}`, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {isHermie ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--violet)" }}>
                      <Wings size={18} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--hname)" }}>Hermie</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-soft)" }}>You</span>
                  )}
                  {n.symbol && <span style={{ fontSize: 11, color: "var(--violet)", border: "1px solid var(--hcard-bd)", borderRadius: 6, padding: "1px 6px" }}>{n.symbol}</span>}
                  <span style={{ flex: 1 }} />
                  <button onClick={() => delNote(n.id)} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 16, lineHeight: 1 }}>{"\u00D7"}</button>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: isHermie ? "var(--htext)" : "var(--ink)" }}>{n.body}</p>
              </div>
            );
          })}
          {!notes.length && !loading && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No notes yet. Save your own, or ask Hermie to jot something down for you.</p>}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", padding: "4px 20px" }}>
        A watchlist isn't a recommendation. Educational, not financial advice.
      </p>
    </div>
  );
}
