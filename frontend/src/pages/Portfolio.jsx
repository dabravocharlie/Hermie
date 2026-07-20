import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api.js";
import { formatCurrency } from "../lib/money.js";

const input = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--divider)",
  background: "var(--card)", color: "var(--ink)", padding: "0 14px", fontSize: 15,
};
const label = { fontSize: 12, color: "var(--ink-soft)", marginBottom: 6, display: "block" };

function relTime(unixSec) {
  if (!unixSec) return "";
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function gainColor(n) {
  if (n > 0) return "var(--green)";
  if (n < 0) return "var(--amber)";
  return "var(--ink-soft)";
}

function AddForm({ onSave, onCancel }) {
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!symbol.trim()) return;
    setBusy(true);
    try {
      await onSave({ symbol, shares, cost_basis: cost });
      onCancel();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginBottom: 14 }}>
      <div>
        <label style={label}>Symbol</label>
        <input style={input} placeholder="e.g. SCHD" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Shares</label>
          <input style={input} type="number" inputMode="decimal" step="0.0001" min="0" placeholder="0" value={shares} onChange={(e) => setShares(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={label}>Avg cost / share</label>
          <input style={input} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--divider)", background: "transparent", color: "var(--ink-soft)", fontSize: 15 }}>Cancel</button>
        <button type="submit" disabled={busy} style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "var(--violet)", color: "#fff", fontSize: 15, fontWeight: 500 }}>{busy ? "Adding..." : "Add holding"}</button>
      </div>
    </form>
  );
}

export default function Portfolio() {
  const api = useApi();
  const [view, setView] = useState("holdings");
  const [data, setData] = useState(null);
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function loadPortfolio() {
    try {
      setLoading(true);
      const d = await api.get("/api/portfolio");
      setData(d);
      setErr("");
    } catch (e) {
      setErr("Couldn't load your portfolio. If the app was idle it may be waking up.");
    } finally {
      setLoading(false);
    }
  }
  async function loadNews() {
    try {
      setNewsLoading(true);
      const n = await api.get("/api/portfolio/news");
      setNews(n);
    } catch (e) {
      setNews({ available: true, articles: [] });
    } finally {
      setNewsLoading(false);
    }
  }
  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (view === "news" && news === null) loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function addHolding(d) {
    await api.post("/api/holdings", d);
    await loadPortfolio();
  }
  async function delHolding(id) {
    await api.del(`/api/holdings/${id}`);
    await loadPortfolio();
  }

  const totals = data?.totals;
  const holdings = data?.holdings || [];
  const pricesOff = data && data.pricesAvailable === false;

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
        {seg("holdings", "Holdings")}
        {seg("news", "News")}
      </div>

      {err && <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>{err}</p>}

      {view === "holdings" && (
        <>
          <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 20, boxShadow: "0 0 22px var(--violet-glow)" }}>
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Total value</p>
            <p className="mono glow-violet" style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-1px", margin: "6px 0 0", color: "var(--violet)" }}>
              {loading && !data ? "\u2014" : totals ? formatCurrency(totals.totalValue) : "\u2014"}
            </p>
            {totals && (
              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>Today</p>
                  <p className="mono" style={{ fontSize: 15, color: gainColor(totals.todayChange) }}>
                    {totals.todayChange >= 0 ? "+" : ""}{formatCurrency(totals.todayChange)} ({totals.todayChangePct.toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total gain</p>
                  <p className="mono" style={{ fontSize: 15, color: gainColor(totals.totalGain) }}>
                    {totals.totalGain >= 0 ? "+" : ""}{formatCurrency(totals.totalGain)} ({totals.totalReturnPct.toFixed(1)}%)
                  </p>
                </div>
              </div>
            )}
          </div>

          {pricesOff && (
            <p style={{ fontSize: 12, color: "var(--amber)", padding: "0 4px" }}>
              Live prices need a Finnhub API key on the backend. Your holdings are saved either way.
            </p>
          )}

          <div style={{ background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 20, padding: 18, boxShadow: "0 0 22px var(--violet-glow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>Holdings</span>
              {!showAdd && <button onClick={() => setShowAdd(true)} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: 14, fontWeight: 500 }}>+ Add</button>}
            </div>
            {showAdd && <div style={{ marginTop: 14 }}><AddForm onSave={addHolding} onCancel={() => setShowAdd(false)} /></div>}
            {holdings.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--divider)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{h.symbol}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{Number(h.shares)} sh @ {formatCurrency(h.cost_basis, true)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {h.priceOk ? (
                    <>
                      <p className="mono" style={{ fontSize: 15, color: "var(--ink)" }}>{formatCurrency(h.value, true)}</p>
                      <p className="mono" style={{ fontSize: 12, color: gainColor(h.gain) }}>{h.returnPct >= 0 ? "+" : ""}{h.returnPct.toFixed(1)}%</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>price n/a</p>
                  )}
                </div>
                <button onClick={() => delHolding(h.id)} aria-label="Delete" style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, lineHeight: 1 }}>{"\u00D7"}</button>
              </div>
            ))}
            {!holdings.length && !showAdd && <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>Add what you own to track value, gains, and today's moves.</p>}
          </div>
        </>
      )}

      {view === "news" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={loadNews} style={{ background: "transparent", border: "1px solid var(--divider)", color: "var(--violet)", fontSize: 13, fontWeight: 500, height: 34, padding: "0 14px", borderRadius: 10 }}>Refresh</button>
          </div>
          {newsLoading && <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "0 4px" }}>Loading news...</p>}
          {news && news.available === false && (
            <p style={{ fontSize: 13, color: "var(--amber)", padding: "0 4px" }}>News needs a Finnhub API key on the backend.</p>
          )}
          {news && news.available !== false && !news.articles.length && !newsLoading && (
            <p style={{ fontSize: 13, color: "var(--ink-soft)", padding: "0 4px" }}>No recent headlines for your holdings. Add a few in the Holdings view.</p>
          )}
          {news && news.articles && news.articles.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "var(--card)", border: "1px solid var(--card-bd)", borderRadius: 16, padding: 14, display: "block" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{a.headline}</p>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                <span style={{ color: "var(--violet)", fontWeight: 500 }}>{a.symbol}</span> &middot; {a.source} &middot; {relTime(a.datetime)}
              </p>
            </a>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", padding: "4px 20px" }}>
        Prices and news are for information only. Educational, not financial advice.
      </p>
    </div>
  );
}
