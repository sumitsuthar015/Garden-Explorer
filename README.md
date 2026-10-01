# Garden Explorer

QR learning trails for kids at **Bharatratna Dr Babasaheb Ambedkar Udyan**, Government Colony,
Bandra East, Mumbai.

Signs around the garden carry QR codes. A child scans one with any phone camera and a short,
playful lesson opens about that exact spot — learning cards, a hands-on observation, a quick quiz
with hints, XP, levels and badges — followed by written directions to the next sign. Lessons cover
**general science, logic and first coding ideas**. Visitors never sign up, and nothing has to be
installed.

Garden staff run everything from a protected admin area: places, lessons, quizzes, trails, badges,
photos, analytics, and printable QR signs and posters.

---

## Contents

1. [What it does](#what-it-does)
2. [The garden and its content](#the-garden-and-its-content)
3. [Stack](#stack)
4. [Project structure](#project-structure)
5. [Local setup](#local-setup)
6. [Environment variables](#environment-variables)
7. [Database, migrations and seed](#database-migrations-and-seed)
8. [Admin accounts](#admin-accounts)
9. [Garden photos](#garden-photos)
10. [Printing QR signs](#printing-qr-signs)
11. [Scripts](#scripts)
12. [Testing](#testing)
13. [Deploying to Vercel](#deploying-to-vercel)
14. [Security](#security)
15. [Privacy, accessibility and offline use](#privacy-accessibility-and-offline-use)
16. [Troubleshooting](#troubleshooting)

---

## What it does

### For visitors (no account, ever)

| Route | What it shows |
| --- | --- |
| `/` | Photo slideshow hero, real-garden photo gallery, subjects, how to play, the *Photo Hunt* game, trails, levels, badges, featured places, visiting info |
| `/scan` | Camera QR scanner, with photo upload and "type the code" fallbacks |
| `/q/[code]` | The lesson for one physical sign, e.g. `/q/STATUE-017` |
| `/explore` | Every published place, filterable by subject |
| `/locations/[slug]` | A place's own page with the same lesson |
| `/trails`, `/trails/[slug]` | Learning trails and each trail's adventure map |
| `/progress` | The child's "passport": places done, XP, level, badges |
| `/about` | Photo banner and tour of the garden, how it works, map and directions |
| `/privacy`, `/accessibility` | Plain-language policy pages |

The flow at every sign:

```
Scan → "You found it!" → Start learning → learning cards → observe → think
     → quick quiz (hints + retries) → place complete, +XP → directions to the next sign
```

What makes it work for kids:

- **Pip**, a robot-sprout mascot who waves, thinks and cheers.
- **XP, levels and badges**: levels run from *Seed* to *Garden Genius*, and 13 badges can be
  unlocked. Points are never taken away.
- **Wrong answers teach.** A hint, another try, then the answer is explained, and points are still
  given.
- **Celebrations** with confetti and small sound effects. A header toggle turns sounds off.
- **Photo Hunt** on the home page: zoomed-in close-ups from real garden photos with riddles. Tap a
  card to flip it and reveal the answer.
- **No map, no GPS inside the garden.** Directions between stops are written by the garden team.
- **Never blocked.** A child can start a trail at any sign. Scanning stop 5 first simply says so.

### For garden staff (`/admin`, sign-in required)

- **Dashboard** with real totals and recent activity.
- **Locations**: name, description, subject, emoji, hero photo, learning cards, facts, activities.
- **Quizzes** with per-question hints and explanations.
- **Trails**: a drag-and-drop builder for stop order and written directions. A trail can only be
  published when every stop is published and has directions.
- **QR codes**:
  - a printable sign for each place;
  - a sheet of all signs;
  - a sheet of one trail's signs, in walking order;
  - a **trail start poster**.
- **Badges, Media, Analytics, Settings** (branding, contact details, analytics on/off), and an
  **audit log** of admin changes.
- The image picker offers the built-in **garden photos** with one click, so no upload is needed for
  them.

Printed codes never change: a place's lesson can be rewritten at any time without reprinting its
sign. One place can belong to several trails and still needs only one sign.

---

## The garden and its content

All garden facts come from public listings (Google Maps, Mappls, visitor reviews) and from photos
taken in the garden. Nothing describes a feature the garden is not known to have.

- **Address:** Government Colony, Bandra East, Mumbai 400051. It is near Ambedkar Chowk, about
  500 m from Bandra Terminus.
- **Opening hours:** every day, 4:00 AM – 8:00 PM.
- **Landmarks used in lessons and directions:**
  - the carved Sanchi-style gateway, with a giant banyan tree beside it;
  - the paved walkway to Dr Ambedkar's statue on its round lawn;
  - the palm grove with the signature wall;
  - the children's play area and jungle gym, next to the blue wall with a bronze-coloured mural.

The seed (`scripts/seed-data.ts`) creates **12 places**, **3 trails** and **13 badges**.

| Sign code | Place | Subject |
| --- | --- | --- |
| `ENTRANCE-001` | Garden Gate | Garden knowledge |
| `STATUE-017` | Babasaheb's Statue | Garden knowledge |
| `LEAF-012` | Leaf Lab | Plants |
| `BUTTERFLY-003` | Butterfly Watch | Animals |
| `PLAY-013` | Swing & Slide Science | Science |
| `MONSOON-016` | Monsoon Lab | Environment |
| `PATTERN-008` | Pattern Path | Logic |
| `RIDDLE-009` | Riddle Stop | Logic |
| `JUNGLE-014` | Jungle Gym Engineers | Logic |
| `WALKWAY-015` | Walkway Loop | Coding |
| `ROBOT-010` | Robot Gardener | Coding |
| `BINARY-011` | Binary Blooms | Coding |

| Trail | Ages | Stops |
| --- | --- | --- |
| Garden Science Trail | All ages, ~40 min | Gate → Statue → Leaf Lab → Butterfly Watch → Swing & Slide → Monsoon Lab |
| Code & Logic Quest | 9–12, ~45 min | Pattern Path → Riddle Stop → Jungle Gym → Walkway Loop → Robot Gardener → Binary Blooms |
| Little Explorers | 5–8, ~25 min | Gate → Butterfly Watch → Swing & Slide → Pattern Path |

Shared garden facts (address, hours, landmarks, map links) live in `GARDEN_LOCATION` in
`lib/constants.ts`.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, React 19, Server Components by default) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, a shadcn-style component set in `components/ui`, Lucide icons |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM with `@neondatabase/serverless` (WebSocket pool, real transactions) |
| Migrations | Drizzle Kit; versioned SQL in `drizzle/migrations` |
| Admin auth | Better Auth (email + password, roles, no public sign-up) |
| Validation and forms | Zod v4 schemas, shared between client and server; React Hook Form |
| QR codes | `html5-qrcode` to scan, `qrcode` to generate PNG and SVG |
| Other | `@dnd-kit` (trail builder), Recharts (analytics), Sonner (toasts), Cloudinary (uploads) |
| Tests | Vitest (unit) and Playwright (end-to-end) |
| Hosting | Vercel and Neon |

---

## Project structure

```
app/
  (public)/              visitor pages: home, scan, q/[code], explore, locations, trails,
                         progress, about, privacy, accessibility, offline
  admin/login/           the only admin page that needs no session
  admin/(dashboard)/     every protected admin page; the layout checks the session
  api/                   auth handler, QR PNG/SVG images, analytics events, upload signing
  layout.tsx  globals.css  manifest.ts  robots.ts  sitemap.ts  error and not-found pages

components/
  ui/          design-system primitives (button, dialog, select, …)
  public/      header, footer, hero photo slideshow, gallery and lightbox, photo strip,
               cards, map, visit section
  kids/        Pip mascot, Photo Hunt, confetti layer, sound toggle, levels, badge shelf
  learning/    arrival screen, learning cards, activities, completion, next place
  quiz/  qr/  trail/  charts/  motion/  providers/
  admin/       CMS: forms, trail builder, QR posters, media picker, editors

db/
  schema/      one module per area, plus enums and relations
  queries/     all database access; public queries only return published content
  index.ts     lazily created Neon pool

lib/
  auth.ts  permissions.ts        Better Auth config; admin guards for every server action
  actions/                       server actions
  validation/                    Zod schemas
  garden-photos.ts               photo imports (+ blur placeholders) and the Photo Hunt cards
  garden-photo-info.ts           photo paths, titles, captions and alt text
  constants.ts  subjects.ts  levels.ts  scoring.ts  badges.ts  celebrate.ts  sounds.ts
  progress/  qr/  env.ts  network.ts  site-url.ts  …

public/images/garden/  real garden photos
public/icons/          app and favicon icons
public/sw.js           service worker
scripts/               migrate, seed (+ seed-data), create-admin, production-check, generate-icons
drizzle/migrations/    SQL migrations
tests/unit/  tests/e2e/
```

Rules the code follows:

- Client components (`"use client"`) are used only where interactivity or a browser API needs them.
- Client components never touch the database. Every query lives in `db/queries`.
- Every admin server action checks the session and permission again, because hiding a link is not
  security.
- Grading, points, badges and completion are worked out on the server from stored data.
- Errors are logged on the server with a code. Visitors only ever see a friendly screen.

---

## Local setup

You need Node.js 20.9 or newer and a PostgreSQL database. Neon's free tier is enough.

```bash
npm install
cp .env.example .env.local      # fill in the values (next section)
npm run db:migrate              # create the tables
npm run db:seed                 # the garden's places, trails, badges and QR codes
npm run admin:create            # your admin account
npm run dev
```

Then open:

- Site: <http://localhost:3000>
- A sample scan: <http://localhost:3000/q/ENTRANCE-001>
- Admin: <http://localhost:3000/admin/login>

---

## Environment variables

Next.js loads `.env.local` automatically. The scripts in `scripts/` load the same file through
`lib/env/load.ts`. Restart `npm run dev` after changing `DATABASE_URL`, because the database pool
is created when the server starts.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon **pooled** connection string, including `?sslmode=require`. |
| `BETTER_AUTH_SECRET` | Yes | At least 32 characters (`openssl rand -base64 32`). Changing it signs every admin out. |
| `BETTER_AUTH_URL` | In production | The site's public origin, with no trailing slash. |
| `NEXT_PUBLIC_APP_URL` | Yes | The public URL that QR codes, canonical links, the sitemap and link previews use. **Printed signs encode it**, so it must be the final address. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional | Needed only for uploading new photos. Without them, uploads are switched off and the built-in garden photos still work. |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional | Defaults to `garden-explorer`. |
| `GARDEN_ANALYTICS_SALT` | Optional | Extra salt for anonymous analytics. |

Only variables that start with `NEXT_PUBLIC_` reach the browser. Never commit `.env.local`.

---

## Database, migrations and seed

- **Change the schema:** edit `db/schema/*`, run `npm run db:generate` to create a migration, then
  `npm run db:migrate`. Migrations never drop data on their own.
- **Seed:** `npm run db:seed` is safe to re-run.
  - It creates anything missing and leaves existing lessons alone.
  - It puts garden photos only into empty image slots.
  - It archives places, trails and badges from earlier demo seeds, and disables their QR codes.
- **Reset the seeded content:** `npm run db:seed -- --force` rewrites the seeded places' cards,
  facts, activities and quizzes, and their photos. Content the admin wrote for those places is
  replaced, so check the admin audit log first.

---

## Admin accounts

- Create one with `npm run admin:create`. It asks for an email and password, or reads
  `ADMIN_EMAIL` and `ADMIN_PASSWORD` when run non-interactively. New passwords need at least 12
  characters, with uppercase, lowercase and a number.
- There is no public sign-up. Only this script creates admin users.
- Change a password from **Admin → Settings**.
- Sign-in is rate-limited to 5 attempts per minute. Sessions last 8 hours and slide while in use.

---

## Garden photos

The real photos live in `public/images/garden/`:

| File | What it shows |
| --- | --- |
| `gate.jpg` | The carved gateway |
| `gate-street.jpg` | The gateway from the road |
| `statue.jpg` | The statue |
| `statue-walkway.jpg` | The walkway to the statue |
| `signature-wall.jpg` | The palm grove and signature wall |
| `play-area.jpg` | The play area |
| `play-area-wide.jpg` | The play area, wide view |

They are used in:

- the home hero slideshow;
- the gallery and lightbox;
- the Photo Hunt game;
- the about page banner and photo strip;
- the "look for this gate" card next to the map;
- place and trail cover images;
- link previews (Open Graph).

To add or replace a photo:

1. Put the JPG in `public/images/garden/`.
2. Add its path, title, caption and alt text to `lib/garden-photo-info.ts`.
3. Import it in `lib/garden-photos.ts`. The static import gives Next.js the image size and a blur
   placeholder.
4. To use it in the Photo Hunt, add a card to `PHOTO_HUNT`. Keep the `focus` point between roughly
   20% and 80% on each axis, so the zoomed close-up still fills the card.

---

## Printing QR signs

1. Deploy the site and set `NEXT_PUBLIC_APP_URL` to its public address. The admin shows a warning
   while QR codes still point at `localhost`, because phones cannot open those.
2. **Admin → QR codes** prints one sign per page, or all signs on a sheet.
3. **Admin → Trails → (a trail)** prints the **trail start poster**, whose QR opens the trail's
   adventure map, and a sheet of that trail's signs in walking order.
4. Every sign also shows its short code (e.g. `LEAF-012`), which can be typed on `/scan` if a camera
   is not available.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build and serve the app |
| `npm run lint` / `typecheck` | ESLint / TypeScript checks |
| `npm test` / `test:watch` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright); `test:e2e:install` downloads Chromium |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations and the database browser |
| `npm run db:seed` | Seed the garden (`-- --force` rewrites seeded content) |
| `npm run admin:create` | Create an admin account |
| `npm run check` | Read-only deployment check; add `-- --url https://your-site` to test the live pages |
| `npm run icons` | Regenerate the PNG app icons in `public/icons` |

---

## Testing

- **Unit tests** (`tests/unit`) cover scoring, levels, progress, publishing rules, QR payloads,
  validation and helpers: `npm test`.
- **End-to-end tests** (`tests/e2e`) run against a seeded database on desktop and mobile viewports.
  They cover:
  - the public pages, with no sideways scrolling on a small phone;
  - the QR entry point and the full learning flow;
  - admin redirects and the login page.

  Run them with `npm run test:e2e`. They start the dev server if one is not already running.

E2E runs write analytics events (scans, quiz attempts). Clear them before real visitors arrive if
the dashboard should start at zero.

---

## Deploying to Vercel

1. Create a Neon project and copy its **pooled** connection string.
2. Import the repository into Vercel. In **Project → Settings → Environment Variables**, add the
   variables from the table above. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the
   production URL.
3. From your machine, with `DATABASE_URL` pointing at the production database, run:
   `npm run db:migrate`, then `npm run db:seed`, then `npm run admin:create`.
4. Deploy, then run `npm run check -- --url https://your-site`.
5. Open `/q/ENTRANCE-001` on a phone, sign in to `/admin`, and only then print the signs.

---

## Security

- **Headers on every response:**
  - a strict Content Security Policy (`next.config.ts`);
  - `X-Frame-Options: DENY` and `frame-ancestors 'none'`;
  - `nosniff` and a strict referrer policy;
  - HSTS in production;
  - a `Permissions-Policy` that allows only the camera and blocks geolocation.
- **Admin pages** are never cached and are marked `noindex`; API responses are never cached either.
  Sessions are checked in the admin layout, and again in every server action.
- **Secrets stay on the server.** The Cloudinary secret is used only to sign uploads, and the
  browser uploads straight to Cloudinary.
- **No grading on the client.** Visitors cannot award themselves points or badges.
- **Image fields** accept full URLs or the site's own `/images/…` paths only.

---

## Privacy, accessibility and offline use

**Privacy**

- Children never create accounts. Progress (places done, XP, badges) is stored only in the
  browser on their own device, and can be cleared from `/progress`.
- Analytics are anonymous: no IP address, no browser details, no email. A random ID in the browser
  is used only to count sessions. Analytics can be switched off in **Admin → Settings**.
- Google Maps is not contacted until the visitor taps **Show interactive map**.

**Accessibility**

- Works with keyboards and screen readers.
- Every photo has alt text.
- The hero slideshow has a pause button.
- Everything stays readable on small phones.
- When the device asks for reduced motion, all animation stops: no slideshow, confetti or
  drifting decorations.

**Offline use**

- The site can be installed as an app.
- The service worker caches only static assets and icons. It never caches `/admin`, `/api` or
  signed-in responses.
- Without a network, pages show a friendly offline screen rather than old content.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `ENV_VALIDATION_FAILED` on start | A required variable is missing or invalid. Compare `.env.local` with `.env.example`. |
| Database connections fail at random, especially from India to a US Neon region | Usually broken IPv6. `lib/network.ts` gives each connection attempt longer to answer, and `db/index.ts` applies it automatically. |
| The site still shows old data after changing `DATABASE_URL` | Restart `npm run dev`. |
| Database login fails after claiming or resetting a Neon project | Neon issued a new password. Copy the new connection string into `DATABASE_URL`. |
| Scanning a printed sign opens `localhost` | `NEXT_PUBLIC_APP_URL` was not set to the public URL when the signs were printed. Fix it and reprint. |
| Photo uploads fail in the admin | Check the three `CLOUDINARY_*` variables, or use the built-in garden photos. |
"# Garden-Explorer" 
