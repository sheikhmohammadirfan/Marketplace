# MarketPlace — Full Project Guide (v3)

MERN classifieds marketplace (OLX-style): enterprise-grade authentication, listings, wishlist,
real-time chat and an AI assistant. Backend → Render, frontend → Vercel, database → MongoDB Atlas.

## What's new in this version

| Area | What you get |
|---|---|
| Layout | Sticky header (search, Sell button, wishlist, chat, account menu), scrolling category bar, full footer, responsive down to phones |
| AI assistant | Floating **"Ask AI"** button in the bottom-right corner on every page. Finds ads in plain English ("cheapest bike under 5000 in Thane"), understands follow-ups ("cheaper ones?"), answers how-to and safety questions, and links to the full filtered results |
| Edit ads | Edit page (`/edit-ad/:id`), reachable from the ad page and **My ads**. Owners and staff only |
| Wishlist | Heart on every card and ad page, instant (optimistic) toggle, header counter, `/wishlist` page |
| Filters + sort | Category, price range, city, condition (multi-select), and sort by newest / oldest / price low→high / price high→low / most viewed. Everything lives in the URL, so results are shareable and Back works. Filter chips, clear-all, pagination |
| Free AI | Provider-agnostic: **Google Gemini (free)** by default, or Groq (free) / OpenAI / OpenRouter by changing env vars only |
| Accounts | Profile page with change-password and **active sessions** list |
| Admin | Search/filter users, role changes, suspend, delete, create staff, audit log |

## 1. Run it locally

```bash
# backend
cd auth-backend-main
npm install
# .env is included — replace YOUR_PASSWORD in MONGO_URL with your Atlas password
npm run seed:superadmin      # once: creates your first superadmin (see SUPERADMIN_* in .env)
npm run dev

# frontend (new terminal)
cd auth-frontend-main
npm install
# .env points at your Render backend; for local use switch to http://localhost:5000/api
npm run dev
```

## 2. AI assistant setup (free)

The AI features are optional. Without a key they show a friendly "not set up yet" message and the
rest of the app works normally. Put these in the backend env (`.env` locally, Render dashboard in production):

**Option A — Google Gemini (default, free, no card):** create a key at https://aistudio.google.com/apikey
```
AI_PROVIDER=gemini
AI_API_KEY=your_key
AI_MODEL=gemini-flash-lite-latest
```
`gemini-flash-lite-latest` is an alias Google keeps pointing at the current Flash-Lite model, so the
app doesn't break when a version is retired. Use `gemini-flash-latest` for smarter answers (lower free quota).

**Option B — Groq (free):** key at https://console.groq.com
```
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your_key
AI_MODEL=llama-3.3-70b-versatile
AI_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

**Option C — OpenAI (paid):** `AI_PROVIDER=openai`, `AI_API_KEY=...`, `AI_MODEL=gpt-4o-mini`.

Notes: free tiers have request limits that Google/Groq can change at any time, so check your quota in their
console. The app also rate-limits AI calls (20 per 10 minutes per person) and shows a "busy, try again" message if the provider says 429.
Price suggestions are rough estimates from the model's general knowledge, not live market data — the UI says so.

## 3. Deploy

**Render (backend)** — set the variables listed in `RENDER_PRODUCTION_ENV.txt`. Most important:
`NODE_ENV=production`, `FRONTEND_URL=https://YOUR-APP.vercel.app` (exact, no trailing slash), `MONGO_URL`,
a **new** `JWT_ACCESS_SECRET`, SMTP settings, and your `AI_*` settings. Do not set `PORT`.

**Vercel (frontend)** — `VITE_API_URL=https://your-backend.onrender.com/api`.

After first deploy, open a Render Shell and run `npm run seed:superadmin` once, then remove `SUPERADMIN_PASSWORD` from the environment.
Chat uses WebSockets (Socket.io); Render supports them, but free instances sleep when idle.

## 4. Behaviour changes you should know about

- **Browsing is public.** Guests can browse, search, view ads and use the AI assistant. Posting, wishlist, chat and account pages ask you to log in and then return you to where you were.
- **Seller emails are no longer exposed** on public pages — only the seller's name.
- **Name is required at signup** (it is shown to buyers and in chat).
- **Thumbnails:** list pages now load a small ~480px thumbnail instead of full photos (much faster). Ads created before this version have no thumbnail — open **Edit → Save changes** once to generate it.
- **Search** matches partial words ("bik" finds "bike") across title and description. All user text in searches is escaped, so it can't be used for regex injection.
- **Removed ads** (taken down by staff) are hidden from the public and can only be restored by staff.
- Env vars: `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` are gone, replaced by `AI_*`.

## 5. Security model (unchanged from v2, summarised)

httpOnly cookie sessions (15-min access token + rotating 30-day refresh token with reuse detection) ·
account lockout after 5 failed logins · rate limits on login/signup/reset/AI · email verification ·
forgot/reset password invalidating all sessions · roles `user` / `admin` / `superadmin` (staff accounts are never
created by public signup) · audit log · helmet, CORS allow-list, NoSQL-injection sanitising, input validation.

## 6. API additions

| Method & path | Purpose |
|---|---|
| `GET /api/listings?category&minPrice&maxPrice&city&condition&q&sort&page&limit` | Browse/search. `sort`: `newest` `oldest` `price_asc` `price_desc` `popular` |
| `PATCH /api/listings/:id` | Edit an ad (owner or staff) |
| `GET /api/wishlist` · `GET /api/wishlist/ids` · `POST/DELETE /api/wishlist/:listingId` | Wishlist |
| `POST /api/ai/assistant` | Public shopping assistant `{message, history, lastFilters}` |
| `POST /api/ai/generate-listing` · `POST /api/ai/suggest-price` | Seller helpers (login required) |

## 7. Still on your to-do list

- **SMTP credentials** for real verification / reset emails (without them, emails print in the server log).
- **Image storage:** photos are stored as base64 inside MongoDB — fine for an MVP, but move to Cloudinary/S3 before real traffic (see `models/Listing.js`).
- Never commit `.env` files (the backend `.gitignore` already excludes it).
