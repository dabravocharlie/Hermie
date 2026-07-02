import express from "express";
import { pool } from "../db.js";
import { getQuote, getCompanyNews, hasKey } from "../lib/finnhub.js";

const router = express.Router();

// Holdings enriched with live prices + computed totals.
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM holdings WHERE user_id = $1 ORDER BY symbol ASC",
    [req.userId]
  );

  if (!hasKey()) {
    return res.json({ pricesAvailable: false, holdings: rows, totals: null });
  }

  const enriched = await Promise.all(
    rows.map(async (h) => {
      const shares = Number(h.shares) || 0;
      const cost = Number(h.cost_basis) || 0;
      try {
        const q = await getQuote(h.symbol);
        const price = Number(q.c) || 0;
        const prevClose = Number(q.pc) || 0;
        const value = shares * price;
        const costTotal = shares * cost;
        return {
          ...h,
          price,
          value,
          costTotal,
          gain: value - costTotal,
          returnPct: costTotal > 0 ? ((value - costTotal) / costTotal) * 100 : 0,
          todayChange: shares * (price - prevClose),
          priceOk: true,
        };
      } catch (e) {
        return { ...h, priceOk: false };
      }
    })
  );

  const priced = enriched.filter((h) => h.priceOk);
  const totalValue = priced.reduce((s, h) => s + h.value, 0);
  const totalCost = priced.reduce((s, h) => s + h.costTotal, 0);
  const todayChange = priced.reduce((s, h) => s + h.todayChange, 0);
  const prevValue = totalValue - todayChange;

  res.json({
    pricesAvailable: true,
    holdings: enriched,
    totals: {
      totalValue,
      totalCost,
      totalGain: totalValue - totalCost,
      totalReturnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      todayChange,
      todayChangePct: prevValue > 0 ? (todayChange / prevValue) * 100 : 0,
    },
  });
});

// Recent news headlines across the user's holdings.
router.get("/news", async (req, res) => {
  if (!hasKey()) return res.json({ available: false, articles: [] });

  const { rows } = await pool.query(
    "SELECT symbol FROM holdings WHERE user_id = $1 ORDER BY symbol ASC LIMIT 12",
    [req.userId]
  );

  const lists = await Promise.all(
    rows.map(async (h) => {
      try {
        const news = await getCompanyNews(h.symbol);
        return news.slice(0, 4).map((n) => ({
          symbol: h.symbol,
          headline: n.headline,
          source: n.source,
          url: n.url,
          datetime: n.datetime,
        }));
      } catch {
        return [];
      }
    })
  );

  const articles = lists
    .flat()
    .filter((a) => a.headline && a.url)
    .sort((a, b) => (b.datetime || 0) - (a.datetime || 0))
    .slice(0, 30);

  res.json({ available: true, articles });
});

export default router;
