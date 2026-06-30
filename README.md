# Hermie — personal finance assistant

Phase 1 foundation: user accounts, the 5-tab app shell, Hermie launcher, and
the light/dark themed design. Nothing stores real financial data yet — that
starts in Phase 2. This phase proves the bones work: you can sign up, log in,
move between tabs, open Hermie, and flip light/dark.

```
hermie/
  backend/    Express + Postgres API (deploys to Render)
  frontend/   React + Vite app (deploys to Vercel)
```

There are three accounts/services involved, all with free tiers:
- Clerk — handles sign up / login (so you don't store passwords)
- Render — runs the backend and the Postgres database
- Vercel — hosts the frontend

Work top to bottom. Each numbered step says exactly what to do.

---

## 1. Create your Clerk application (handles logins)

1. Go to https://clerk.com and create a free account.
2. Click "Create application". Name it `Hermie`.
3. Choose sign-in options (Email is fine to start; you can add Google/Apple later).
4. On the API Keys page you'll see two keys. Keep this tab open — you'll paste these soon:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

---

## 2. Create the database + backend on Render

### 2a. Postgres
1. Go to https://render.com, sign in, click New > Postgres.
2. Name it `hermie-db`, pick the free plan, create it.
3. When it's ready, copy the "Internal Database URL" (you'll use this for the backend on Render). There's also an "External Database URL" — use that one only if you ever run the backend on your own PC.

### 2b. Backend web service
1. Push this project to a new GitHub repo first (see step 4 if you need the how-to), then in Render click New > Web Service and connect that repo.
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Under Environment, add these variables:
   - `DATABASE_URL` = the Internal Database URL from 2a
   - `CLERK_SECRET_KEY` = your `sk_...` key
   - `CLERK_PUBLISHABLE_KEY` = your `pk_...` key
   - `FRONTEND_ORIGIN` = `http://localhost:5173` for now (you'll add the Vercel URL after step 3)
4. Create the service. When it finishes deploying, note its URL, like `https://hermie-api.onrender.com`.

### 2c. Build the database tables
1. In Render, open your backend service > Shell.
2. Run: `npm run db:init`
3. You should see "Schema ready." This creates all the tables. It's safe to run again anytime.

---

## 3. Deploy the frontend on Vercel

1. Go to https://vercel.com, sign in, New Project, import the same GitHub repo.
2. Settings:
   - Root Directory: `frontend`
   - Framework Preset: Vite (Vercel usually detects this)
3. Add Environment Variables:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your `pk_...` key
   - `VITE_API_URL` = your Render backend URL from 2b (e.g. `https://hermie-api.onrender.com`)
4. Deploy. You'll get a URL like `https://hermie.vercel.app`.
5. Go back to Render > backend > Environment, and update `FRONTEND_ORIGIN` to include your Vercel URL, comma-separated with localhost:
   `https://hermie.vercel.app,http://localhost:5173`
   Save (the backend redeploys automatically).

Open your Vercel URL, create an account, and you should land in the app.

---

## 4. Pushing this code to GitHub

If you're starting fresh from this folder on your PC:

```
cd path\to\hermie
git init
git add -A
git commit -m "Hermie phase 1 foundation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hermie.git
git push -u origin main
```

If you edit files in the GitHub browser editor too, remember to `git pull`
before pushing from your PC, or use `git push --force` if you intend the PC
copy to win.

---

## 5. Running it on your own PC (optional, for testing)

Open two terminals.

Backend:
```
cd backend
copy .env.example .env        (then open .env and fill in the values)
npm install
npm run db:init               (only needed once, or after schema changes)
npm start
```

Frontend:
```
cd frontend
copy .env.example .env        (then open .env and fill in the values)
npm install
npm run dev
```

Visit http://localhost:5173.

---

## What's here in Phase 1

- Sign up / log in / log out (Clerk)
- Every database table has a `user_id` so accounts are fully separated
- 5-tab bar: Home, Bills, Portfolio, Research, Calendar
- Hermie floating button + slide-up panel (intro only for now)
- Light theme by default, working dark-mode toggle, violet glow, wings logo
- A protected `/api/me` endpoint that confirms auth works end to end

## Coming next (the plan)

- Phase 2: Bills & Income (the engine behind "safe to spend")
- Phase 3: Dashboard wired to real numbers
- Phase 4: Portfolio (holdings + news) and Research/Watchlist with shared notes
- Phase 5: Calendar reminders
- Phase 6: Hermie fully online — reads across modules, talks, uses the web
- Phase 7: Capacitor wrap + privacy policy for the App Store / Play Store

Hermie is built as an educational guide, not a financial advisor — it explains
your money and what the numbers mean, and won't tell you what to buy or sell.
