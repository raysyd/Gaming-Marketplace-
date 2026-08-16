# Sidegrade

An Australian peer-to-peer marketplace for gaming PCs, GPUs and gaming gear. The platform
holds no inventory: sellers list, buyers pay through the site, and the money is
released to the seller once delivery is confirmed, minus a platform fee.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Stripe Connect.

---

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

It runs with **no configuration at all** — a demo catalogue, demo message
threads and a working cart are bundled, so you can show it to someone before any
backend exists. Adding keys progressively switches on the real thing.

## Deploy (about 15 minutes)

1. **Push to GitHub**
   ```bash
   git init && git add -A && git commit -m "Sidegrade"
   git remote add origin https://github.com/YOU/sidegrade.git
   git push -u origin main
   ```
2. **Vercel** → New Project → import the repo → Deploy. No settings to change.
3. **Supabase** → new project → SQL Editor → paste `supabase/schema.sql` → Run.
   Then Settings → API, and copy the URL, the anon key and the service role key.
4. In Vercel → Settings → Environment Variables, add everything from
   `.env.example`, then redeploy.
5. **Stripe** (when you're ready to take money) → enable Connect →
   add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and point a webhook at
   `https://yourdomain.com/api/webhooks/stripe`.

### Production magic-link email

Supabase's built-in email service is intentionally rate-limited and is not
intended for marketplace authentication traffic. Before inviting real users:

1. In Supabase, open **Authentication → SMTP Settings** and connect a
  transactional email provider using your verified Sidegrade domain.
2. In **Authentication → URL Configuration**, add all three production callback
  URLs: `https://yourdomain.com/auth/complete`,
  `https://yourdomain.com/auth/callback`, and
  `https://yourdomain.com/auth/reset-password`.
3. In **Authentication → Rate Limits**, review the OTP and email limits after
  SMTP is enabled. Keep the app's resend cooldown in place to prevent abuse.
4. Configure SPF, DKIM and DMARC for the sending domain so magic links reach
  inboxes reliably.

The login screen provides resend and change-email actions, but it cannot bypass
Supabase Auth or SMTP provider limits from the browser.

### Password sign-in

`/login` also supports email + password (sign up, sign in, forgot password),
alongside the magic link and Google options — pick whichever suits your users.

- Client-side password rules live in `lib/password.ts` (8+ characters, a
  letter, a number, not a common password). Set a matching minimum under
  **Authentication → Providers → Email → Password Requirements** so the
  server doesn't reject something the client accepted.
- Run `supabase/auth-security.sql` once (already folded into `setup.sql` as
  Part 4 for fresh installs) to add per-account sign-in lockout: 5 failed
  password attempts on one email locks it for 15 minutes, on top of — not
  instead of — Supabase's own IP-based **Authentication → Rate Limits**.
- If email confirmation is on (Supabase's default), new accounts see a
  "check your inbox" screen before they can sign in; turn it off in
  **Authentication → Providers → Email** if you'd rather they land straight
  in.

## Built to scale

The catalogue is queried, not loaded. Search, filters, sort, pagination and
facet counts all run in Postgres and return one page (24 listings) at a time —
the browser never receives the full catalogue, so a shop page costs the same
whether there are 60 listings or 600,000.

- **Filters are URLs, not client state.** Every filtered view has its own
  address, so it's shareable, back-button-correct, and cacheable at the edge.
- **Full-text search** uses a stored generated `tsvector` with a GIN index.
  Postgres does the work once on write instead of on every query, and title
  matches outrank description matches.
- **Partial indexes** cover each sort and filter path (`status = 'active'`
  only), so the planner never scans sold or draft rows.
- **`watchers` is denormalised** and kept current by a trigger, so "most
  watched" is an indexed sort rather than a join and count per page load.
- **ISR caching** — the homepage revalidates every 60s, listings every 120s.
  Repeat visitors are served from the edge without touching the database.
- **Rate limiting** on the write endpoints (`lib/rate-limit.ts`), in-memory for
  now with a note on where to swap in Redis once you run more than one instance.

Run `supabase/scaling.sql` after `schema.sql` to get the indexes, the search
column, the facet-count function and the wishlist table.

### What to watch as you grow

The in-memory rate limiter is per-instance — move it to Upstash Redis before
scaling past one. Supabase realtime has a concurrent-connection ceiling on
lower tiers, which is the first thing messaging will hit. And use Supabase
Storage's image transform parameters rather than serving full-size uploads;
photos will be your bandwidth bill, not HTML.

## What's built

| Area | Route | Notes |
|---|---|---|
| Storefront | `/` | Featured drop, categories, price drops, escrow explainer |
| Browse | `/shop` | Search, category/condition filters, price slider, sorting |
| Listing | `/product/[id]` | Spec sheet, FPS estimate, seller card, buy box |
| Messaging | `/messages` | Threaded buyer↔seller chat, offer cards, live updates |
| Selling | `/sell` | Listing form with live payout calculation |
| Cart | `/cart` | Checkout → Stripe session |
| Seller account | `/dashboard` | Listings, escrow balance, payout connection |
| Auth | `/login` | Email + password, magic link, or Google |
| Wishlist | `/wishlist` | Saved items, feeds the "most watched" ranking |
| PC Finder | `/pc-finder` | Three-question quiz routing to matching listings |
| Trust | `/trust` | Escrow, verified sellers, off-platform payment warning |

Catalogue is two levels deep (`lib/taxonomy.ts`): Full Systems, PC Parts &
Components, Peripherals and Consoles, each with subcategories. Listing URLs are
`/product/{id}/{slug}` for SEO.

### Messaging

`components/Messenger.tsx` is the whole surface. It works three ways:

- **Demo mode** — threads live in React state, so it's fully clickable with no backend.
- **Connected** — messages POST to `/api/messages`, which writes to Supabase under RLS
  that only lets the two participants read a thread.
- **Live** — when Supabase is configured it subscribes to `postgres_changes` on
  `messages` for the open conversation, so the other side's replies appear without a refresh.

Deep links work: "Message seller" on a listing opens `/messages?listing=<id>` and
creates the thread if it doesn't exist. "Make an offer" adds `&offer=<amount>`
and posts an offer card the seller can accept or counter.

### Escrow

`/api/checkout` creates a Stripe Checkout session with `capture_method: "manual"`,
so the buyer's card is authorised but not charged. The order moves
`pending → paid → shipped → delivered → released`, and capture happens on
delivery confirmation. `PLATFORM_FEE_BPS` sets your cut (800 = 8%).

## Renaming and re-regioning

Everything user-facing — name, tagline, support email, fee, region, currency and
locale — comes from `lib/brand.ts`. Change `currency` to `USD` and `locale` to
`en-US` and every price on the site reformats; change `regionLabel` and the
shipping copy follows. That single file is what makes the codebase portable to
another market.

## Listing photos

Every surface that shows a listing renders the seller's real photo when one
exists and falls back to generated category artwork when it doesn't, so a
listing never renders broken.

Three ways a photo gets in:

1. **Seller upload** — `/sell` has a photo picker. With Supabase configured it
   uploads to the `listing-photos` storage bucket and stores public URLs on the
   listing. Without it, photos preview locally so the form still demos.
2. **Drop-in files** — put images in `public/products/` named after the listing
   id (`l-002.jpg`, plus `l-002-2.jpg` for extra angles). See the README in
   that folder.
3. **Any URL** — set `image` and `images` on a listing to absolute URLs.

Photograph the actual hardware. Press renders are copyrighted and misrepresent
the condition of a used unit, which is the one thing secondhand buyers care
about.

## Not built yet

Ratings after a completed order, dispute handling, and shipping label purchase.
