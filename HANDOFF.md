# DETAILR — Performansion instance handoff (continue in new chat)

Upload this file at the start of a new conversation to resume.

## WHAT THIS IS
Detailr: single-tenant-per-shop SaaS for car detailing / PPF studios.
Booking flow + live job-tracking + per-stage photos + studio admin panel.
Stack: React 19 + Vite 8 + Tailwind 3.4 + three.js (lazy) + Supabase.

THIS BUILD is branded for **PERFORMANSION** (Dubai PPF studio, ICONIX PRO film).
It is a SEPARATE instance from the Apex demo — its own repo, Vercel, and Supabase.
The Apex demo stays live and untouched.

## PERFORMANSION INSTANCE
- New GitHub repo: created under handle skproductions68 (connect to a NEW Vercel project).
- Supabase project id: ddekzmmdvlnknhnxdjnx (region ap-south-1 / Mumbai).
  URL: https://ddekzmmdvlnknhnxdjnx.supabase.co
- Staff login (demo): emp1@gmail.com / emp1  (VERIFY before sharing the link)
- Source files for this instance live in src/ + index.html (this package).
- No Vercel env vars needed — Supabase URL + anon key are in src/supabase.js.

## SHOP DATA SEEDED (live in Supabase)
- Identity: Performansion · Dubai · +971 54 990 9565 · info@performansion.com · AED.
- Film brand: ICONIX PRO. Packages: Front / Full Body Gloss / Full Body Matt.
- Sizes: Small (1.0x) / Medium (1.25x) / Large (1.55x). 7-year warranty.
- Add-ons: Ceramic, Window Tint, Interior Detail, Wheel PPF, Door Edge Guards.
- Pipeline: Inspection > Wash & Decon > Paint Correction > PPF Application >
  Curing & QC > Ready for Collection (final).
- 29 vehicles (Dubai high-end skew). 5 demo bookings spread across stages.

## WHAT WAS THEMED vs BASE DETAILR REPO
Only 7 files differ from the original detailr repo:
- src/supabase.js  -> points at the new Performansion Supabase project.
- index.html       -> title / meta -> Performansion.
- src/App.jsx, src/BookingFlow.jsx, src/TrackingView.jsx, src/index.css, src/fx.jsx
  -> accent colour changed from Apex red (#e10600) to azure (#2e7dff) throughout.
Everything else (Car3D, AdminPanel, useShopData, currency, configs) is unchanged.
Shop NAME/packages/contact are NOT hardcoded — they render from Supabase, so the
whole app already reads "Performansion" automatically.

## PRICES ARE PLACEHOLDERS
ICONIX PRO package prices (AED 3,000 / 6,500 / 7,500 base) are illustrative, NOT
quotes from Performansion. Edit them in Studio Admin -> Packages, or before pitching.

## DEPLOY
1. Put this codebase in the new GitHub repo (full project) OR, if the repo already
   has the Detailr code, just replace the 7 files above.
2. Connect that repo to a new Vercel project -> deploy (no env vars).
3. Open the Vercel URL, log in with emp1@gmail.com / emp1, confirm data loads,
   then test: book a car -> track the plate -> upload a stage photo from admin.

## NEXT
- Cold IG DM / WhatsApp to @performansion (info@performansion.com / wa.me/971549909565)
  with the live link once deployed and login-checked.
- Same future hardening as Apex: customer names/phones are readable via the anon key
  (move tracking behind RPCs before real customer data).

## OTHER LEADS (unchanged)
- Apex Detail Studio (Dubai) — closed for now (2 weeks silent; graceful sign-off sent).
- Regal PPF (UK), PPF Centre Ipswich, Unique Detail MK, Carz Crew Karachi — switch to
  IG DM / WhatsApp rather than email if revisited.
