// Thin wrapper around Finnhub's free endpoints. The API key stays server-side
// and is never exposed to the browser.
const KEY = process.env.FINNHUB_API_KEY;
const BASE = "https://finnhub.io/api/v1";

export function hasKey() {
  return Boolean(KEY);
}

// Current quote: { c: current, d: change, dp: %change, pc: prev close }.
export async function getQuote(symbol) {
  const r = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`);
  if (!r.ok) throw new Error(`Finnhub quote ${symbol}: ${r.status}`);
  return r.json();
}

// Recent company news (last 7 days).
export async function getCompanyNews(symbol) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const to = new Date();
  const from = new Date(Date.now() - 7 * 86400000);
  const r = await fetch(
    `${BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(to)}&token=${KEY}`
  );
  if (!r.ok) throw new Error(`Finnhub news ${symbol}: ${r.status}`);
  const arr = await r.json();
  return Array.isArray(arr) ? arr : [];
}
