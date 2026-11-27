# Aurum Kitchen — Premium Food Booking & Management Platform

A frontend-only demonstration of a food management and advance-booking
workflow. Two synchronized interfaces — customer and provider — share a
single data layer built on `localStorage`.

## Run it

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. Customer site: `http://127.0.0.1:5500/index.html`
5. Provider panel: `http://127.0.0.1:5500/admin/dashboard.html`

No build step, no backend, no database.

## Tech

HTML5 · CSS3 · Vanilla JavaScript · `localStorage`.
No frameworks, no bundlers, no TypeScript.

## Team

- **Arsh** — Customer module (menu, cart, booking, my-bookings)
- **Kanish** — Provider module (dashboard, bookings, menu management, availability)

## Shared data contract

| `localStorage` key | Purpose |
|---|---|
| `fm_menu_v1` | Array of food items |
| `fm_bookings_v1` | Array of bookings |
| `fm_cart_v1` | Cart lines (foodId + quantity) |
| `fm_booking_seq_v1` | Booking ID sequence |
| `fm_seed_version_v1` | Seed marker |

Custom events used for same-tab sync:
`fm:menu-changed`, `fm:bookings-changed`, `fm:cart-changed`.

Cross-tab sync uses the native `storage` event (handled inside `storage.js`).

## Booking lifecycle

`Pending → Accepted → Preparing → Ready → Completed`

Terminal/alternate: `Cancelled` (customer, before cooking), `Rejected` (provider).

## Key demo flow

1. Customer adds a dish → cart badge updates.
2. Customer books a future date/time → booking appears with status `Pending`.
3. Open `admin/bookings.html` **in the same browser**.
4. Provider accepts / prepares / completes the booking.
5. Customer's `my-bookings.html` reflects each status change live.

## Browser support

Latest Chrome, Edge, Firefox, Safari. Requires `IntersectionObserver`
(present in all modern browsers). Fully respects `prefers-reduced-motion`.

## Known limitations

`localStorage` is per-browser and per-origin. This is a frontend
demonstration of a workflow, **not** a multi-user production system.