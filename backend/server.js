import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import { requireUser } from "./middleware/auth.js";
import { pool } from "./db.js";
import incomeRouter from "./routes/income.js";
import expensesRouter from "./routes/expenses.js";
import summaryRouter from "./routes/summary.js";
import holdingsRouter from "./routes/holdings.js";
import portfolioRouter from "./routes/portfolio.js";
import eventsRouter from "./routes/events.js";
import researchRouter from "./routes/research.js";
import hermieRouter from "./routes/hermie.js";
import profileRouter from "./routes/profile.js";
import wishlistRouter from "./routes/wishlist.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS ---------------------------------------------------------------
// FRONTEND_ORIGIN is your Vercel URL (and http://localhost:5173 for local dev).
// Comma-separate multiple origins in the env var.
const origins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);

app.use(express.json());

// Clerk attaches auth info to every request. Routes decide whether to require it.
app.use(clerkMiddleware());

// --- Public routes ------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({ name: "Hermie API", status: "ok" });
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable", message: err.message });
  }
});

// --- Protected routes ---------------------------------------------------
// Confirms auth is wired correctly end to end. Phase 2+ routes mount here.
app.get("/api/me", requireUser, (req, res) => {
  res.json({ userId: req.userId });
});

// Phase 2 — Bills & Income. Every route requires a signed-in user and is
// scoped to that user inside the route handlers.
app.use("/api/income", requireUser, incomeRouter);
app.use("/api/expenses", requireUser, expensesRouter);
app.use("/api/summary", requireUser, summaryRouter);

// Phase 4 — Portfolio. Holdings CRUD + live-price enrichment + news.
app.use("/api/holdings", requireUser, holdingsRouter);
app.use("/api/portfolio", requireUser, portfolioRouter);

// Phase 5 — Calendar. Reminders for IPOs, bills, and appointments.
app.use("/api/events", requireUser, eventsRouter);

// Phase 6 — Research/Watchlist + the full Hermie assistant.
app.use("/api/research", requireUser, researchRouter);
app.use("/api/hermie", requireUser, hermieRouter);
app.use("/api/profile", requireUser, profileRouter);

// Purchase wishlist \u2014 items the user wants to buy, with budget-fit guidance.
app.use("/api/wishlist", requireUser, wishlistRouter);

app.listen(PORT, () => {
  console.log(`Hermie API listening on port ${PORT}`);
  console.log(`Allowed origins: ${origins.join(", ")}`);
});
