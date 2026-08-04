<div align="center">

# PlanForge FE

**Web UI for hotel operators and the front desk**

From reservations to night audit and performance reports — the screens actually used on shift. All
data is fetched from BE inside server components.

[한국어](README.md) · **English** · [中文](README.zh.md) · [日本語](README.ja.md)

![TSX](https://img.shields.io/badge/TSX-67.0%25-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-26.2%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-1.7%25-083FA1?style=flat-square)
![YAML](https://img.shields.io/badge/YAML-1.3%25-CB171E?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-0.9%25-1572B6?style=flat-square&logo=css3&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-0.5%25-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## Background

A hotel front desk **does several things at once on one screen**. While the guest is standing there
you look up the reservation, assign a room, encode a key and take payment. This UI therefore
prioritises **making the current state unmistakable** over looking impressive.

Three principles shaped it.

**Server components first** — all data is fetched on the server. Client components exist only where
form state is needed. `cache: 'no-store'` keeps the view current, and if BE is unreachable the route
survives and shows an error notice instead of crashing.

**Never hide the outcome** — when OPERA or the PSP rejects something, the reason is shown verbatim.
A screen that only says "the operation failed" leaves the front desk with no idea what to fix.

**Never hide mock mode** — if the door lock or payment driver is running in mock, the screen says
so. It prevents the case where staff believe a key was encoded and the guest cannot get in.

### Platform

| Repository                                                                            | Role                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------ |
| **PlanForge-Package-FE**                                                              | **Operator / front-desk web UI**           |
| [PlanForge-Package-BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)     | Business logic · own database              |
| [PlanForge-Package-Core](https://github.com/PlanForge-Package/PlanForge-Package-Core) | Oracle OPERA (OHIP) integration API server |

Call path: `FE → BE → Core → OPERA Cloud (OHIP)`

---

## Language & stack

| Area            | Technology                                                   |
| --------------- | ------------------------------------------------------------ |
| Language        | TypeScript 5.9 (strict)                                      |
| Framework       | Next.js 15 (App Router · server components · server actions) |
| UI              | React 19                                                     |
| Styling         | Tailwind CSS 4 (`@theme` tokens · dark mode aware)           |
| State           | `useActionState` — no separate state library                 |
| Auth            | httpOnly cookie + middleware + layout guard                  |
| Quality         | ESLint · Prettier · GitHub Actions                           |
| Deployment      | Docker (standalone output · non-root)                        |
| Package manager | pnpm 9                                                       |

### Design tokens

```css
--color-ink: #333d4b /* body text */ --color-muted: #8b95a1 /* secondary text */
  --color-brand: #3182f6 /* buttons */ --color-brand-hover: #2272eb /* button hover */;
```

---

## Directory structure

```
src/
├── app/
│   ├── login/                    Login (public)
│   ├── logout/route.ts           Clears the cookie — only possible in a route handler
│   └── (app)/                    Authenticated — the layout calls requireUser()
│       ├── page.tsx              Dashboard
│       ├── reservations/         List · new · detail (amend · check-in · folio · keys · payment)
│       ├── blocks/               Group blocks · detail (allotment grid · rooming list)
│       ├── profiles/             Guest search · detail (history · duplicate merge)
│       ├── rooms/                Room status
│       ├── rates/               Rate plans · seasons · packages
│       ├── housekeeping/         Task assignment · progress · discrepancies
│       ├── night-audit/          Close-of-day checklist · no-show
│       ├── cashier/             Per-shift collections · close
│       ├── ar/                  City-ledger accounts · invoices
│       ├── reports/              Occupancy · ADR · RevPAR · channel breakdown
│       │   └── journal/         Closing journal · tax · reconciliation
│       ├── pos-outlets/          POS outlet key management
│       ├── users/                Account management (admin)
│       └── account/              My account
├── components/
│   ├── action-feedback.tsx       ActionMessage · SubmitButton (disabled while pending)
│   ├── nav.tsx                   Role-aware menu · property switcher
│   ├── booking-form.tsx          Pick availability → guest details → book
│   ├── front-desk.tsx            Check-in · check-out
│   ├── folio-panel.tsx           Folios · postings · transfer between windows
│   ├── folio-routing-panel.tsx   Routing instructions (code → window)
│   ├── payment-panel.tsx         Authorize · capture · void · refund
│   ├── policy-panel.tsx         Guarantee · cancellation terms · deposit
│   ├── room-key-panel.tsx        Issue · revoke room keys
│   ├── room-outage-panel.tsx     Out-of-order / out-of-service periods
│   ├── rate-panels.tsx          Rate plans · packages
│   ├── rate-plan-detail.tsx     Base amounts · season editor
│   ├── block-form.tsx            Create · amend blocks
│   ├── profile-editor.tsx        Preferences · membership · notes · merge
│   ├── outlet-admin.tsx          POS outlet issue · rotate
│   ├── housekeeping-board.tsx    Assignment · progress
│   ├── night-audit-board.tsx     Checklist · no-show
│   ├── cashier-panel.tsx         Open · close a shift · past shifts
│   ├── ar-panels.tsx             Accounts · payments · invoices
│   ├── ar-transfer-panel.tsx     Folio balance → account
│   ├── ar-aging.tsx             Aging by bucket
│   ├── invoice-document.tsx     Invoice document (print · PDF)
│   ├── trace-panel.tsx           Traces on a reservation · complete
│   ├── share-panel.tsx           Share a room · leave the group
│   ├── daily-traces.tsx          Today's traces (dashboard)
│   └── notice.tsx                ErrorNotice · InfoNotice · EmptyState
├── lib/
│   ├── api.ts                    apiFetch (server only) · ApiError · tryFetch
│   ├── action-state.ts           ActionState · preserves input on failure
│   ├── auth.ts                   requireUser · logoutUrl
│   ├── property.ts               Selected-property context
│   ├── types.ts                  BE response types
│   ├── channel-labels.ts         Source-of-business code labels
│   └── profile-labels.ts         Preference code labels
└── middleware.ts                 Redirects to /login when the cookie is absent
```

---

## Getting started

### Requirements

- Node.js 20.11+
- pnpm 9
- A running [PlanForge BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)

### Install and run

```bash
pnpm install
cp .env.example .env.local     # set BE_BASE_URL
pnpm dev -- -p 3200
```

Open `http://localhost:3200`. Seed account: `manager@planforge.local` / password `planforge` (see
the BE repository).

### Commands

| Command                                        | Description            |
| ---------------------------------------------- | ---------------------- |
| `pnpm dev`                                     | Development server     |
| `pnpm build` / `pnpm start`                    | Build / production run |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | Quality checks         |

### Environment variables

| Name                      | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `BE_BASE_URL`             | BE URL (server components only — a container-internal address works) |
| `CORE_BASE_URL`           | Core URL                                                             |
| `NEXT_PUBLIC_BE_BASE_URL` | Fallback for cases that need it in the browser                       |

---

## Screens

| Path                         | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `/`                          | Dashboard — today's arrivals, departures, in-house, room status              |
| `/reservations`              | Reservation list — search by number or name, filter by status and channel    |
| `/reservations/new`          | New reservation — check availability and rates, then create                  |
| `/reservations/[id]`         | Detail — amend · cancel, check-in/out, folio, room keys, payment             |
| `/blocks` `/blocks/[id]`     | Group blocks — allotment vs pickup, per-date grid, rooming list              |
| `/profiles` `/profiles/[id]` | Guest profiles — search, stay history, duplicate merge                       |
| `/rooms`                     | Rooms — status changes (delegated to OPERA), occupancy, out-of-order periods |
| `/rates` `/rates/[code]`     | Rates — plans and sell windows, seasons, packages                            |
| `/housekeeping`              | Housekeeping — assignment, progress, discrepancies                           |
| `/night-audit`               | Night audit — close-of-day checklist, no-show handling                       |
| `/cashier`                   | Cashier close — per-shift collections and cash count                         |
| `/ar` `/ar/[id]`             | City ledger — balances and credit limits, payments, invoices                 |
| `/ar/invoices/[id]`          | Invoice document — lines and payments, print or save as PDF                  |
| `/reports`                   | Performance — occupancy, ADR, RevPAR, channel breakdown (manager)            |
| `/reports/journal`           | Closing journal — revenue by code, tax, payments, reconciliation (MANAGER)   |
| `/pos-outlets`               | POS outlets — issue, rotate, deactivate keys (manager)                       |
| `/users`                     | Account management — hire, role, leave (admin)                               |
| `/account`                   | My account — change password                                                 |

---

## Design decisions

### Authentication

The access token lives in an **httpOnly cookie**. `localStorage` leaks entirely the moment one XSS
lands; an httpOnly cookie cannot be read by script.

Protection is three layers deep.

1. **Middleware** — redirects to `/login` when the cookie is missing. It does not verify the
   signature: that would put the secret in the edge bundle and split the verification rules across
   two places.
2. **`(app)` layout** — `requireUser()` checks account state with BE on every request, so adding a
   new page cannot accidentally skip protection.
3. **BE guards** — the real enforcement. Hiding menu items is only a convenience.

Expired or forged tokens are handled by the `/logout` route handler, which clears the cookie and
redirects. Cookies can only be mutated in server actions and route handlers, so clearing one from a
layout throws and traps the user on an error screen.

### Multi-hotel

The property switcher in the navigation sets the reference hotel for the whole UI, and the choice is
kept in a cookie for 12 hours. Precedence: cookie → account's property → first hotel.

The hotel is chosen by the switcher, not by the URL. Passing it in a query string would suggest that
editing the address shows another hotel — the actual decision is BE's.

Staff assigned to a property receive only their own hotel, so the name is shown instead of a
switcher. There is no reason to display options that cannot be selected, and simply listing other
hotels' names reveals the organisation's structure.

### Form actions

Actions return an `ActionState` instead of throwing — a server action that throws has its message
stripped in production, leaving only a digest, and the user cannot tell what to fix.

A failed action **also returns the submitted values** (`ActionState.values`). React 19 resets
uncontrolled inputs once a form action completes, so without returning them a fully filled form is
wiped and replaced by a single error line. The screen replants those values as `defaultValue`.

Action state lives in **the panel that contains the rows, not in the rows themselves.** Once an item
is handled it drops out of the list, taking any message bound to it along. The message shown follows
**the most recently executed action**, not a fixed priority.

### Idempotency keys

The payment form generates its idempotency key with `crypto.randomUUID()` per attempt. `useId()`
must not be used — it is derived from the component's position, so it repeats on every page load,
and a new payment is then treated as a retransmission of the previous one: **nothing is charged and
a different amount is reported as success.**

It is left empty during server rendering and filled after mount; seeding initial state with a random
value would break hydration.

---

## Deployment

```bash
docker build -t planforge-fe .
```

Next.js standalone output, running as non-root. For the full stack see
`deploy/docker-compose.yml` in the BE repository.

---

## Licence

UNLICENSED — internal use only.
