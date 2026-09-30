<div align="center">

<img src="public/images/brand/logo.png" alt="Zovita+" width="84" height="84">

# Zovita+

**Care, delivered with calm.**
An online pharmacy for Pakistan: 1,000+ real medicines, syrups and supplements, a 3D symptom body map, pharmacist-verified orders, prescription uploads and cash on delivery.

[![CI](https://github.com/ahmershahdev/zovita/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmershahdev/zovita/actions/workflows/ci.yml)
![PHP 8.2+](https://img.shields.io/badge/PHP-8.2%2B-0b1b33?logo=php&logoColor=white)
![Laravel 12](https://img.shields.io/badge/Laravel-12-0b1b33?logo=laravel&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-0b1b33?logo=react&logoColor=white)
![Tailwind 4](https://img.shields.io/badge/Tailwind-4-0b1b33?logo=tailwindcss&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-9ef0c2)](LICENSE)

[Features](#features) · [Stack](#stack) · [Getting started](#getting-started) · [Architecture](#architecture) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

<img src=".github/assets/home.jpg" alt="Zovita+ home page with a 3D pill hero" width="100%">

</div>

---

## Features

**Storefront**
- 1,186 products across 8 departments, 118 categories and 212 brands: real names, prices, discounts, stock and prescription flags, plus generics, uses, dosage, precautions and warnings.
- Every product image is stored locally as WebP in two sizes (640/320) and served with a responsive `srcset`.
- Server-side filters (category, brand, form, Rx/OTC, stock, price), sorting and pagination, plus ⌘K instant search.
- Detailed product pages: photo/3D pack viewer (drag to spin), at-a-glance facts, delivery estimate by city, sticky section nav, a price-insight histogram against the category, "same salt, other brands", recently viewed and `Product` JSON-LD.
- **Sold out?** Product pages, cards and the bag suggest in-stock alternatives, matched by active ingredient first, then category and price — with one-tap swap in the bag.
- **Body map**: rotate a 3D mannequin, click where it hurts, pick a symptom and get self-care tips, red flags and pharmacist picks. Emergency symptoms (e.g. chest pain) show urgent-care guidance instead of products.

**Ordering**
- Session bag with prices re-read from the database, a free-delivery threshold and a per-order cap.
- Cash-on-delivery checkout that decrements stock inside a row-locked transaction.
- A prescription upload is required when the bag contains Rx medicine. Files are stored privately and never web-accessible.
- Order tracking by order number + email, and an order history for signed-in customers.

**Accounts**
- Register, sign in, password reset, profile and password change.
- The wishlist works for guests and is merged into the account on sign-in.

**Email: [Resend](https://resend.com)**
- Order confirmation (customer + team), welcome, password reset, contact acknowledgement, prescription receipt (the team copy includes the attachment) and newsletter.
- A mail-provider outage never breaks checkout: failures are reported, not thrown.

**Protection: Google reCAPTCHA**
- **v3** (invisible, score + action) on login, checkout, contact, newsletter and password reset.
- **v2** (checkbox) on sign-up and prescription upload.
- Rate limits, a honeypot, enumeration-safe responses and security headers.

**Design**
- Self-hosted type system: **Bricolage Grotesque** (variable, optical-size + width axes) display, **Instrument Serif** italic accents, **Geist** text, **Geist Mono** labels.
- Light and dark themes (system preference, saved choice, no flash) with a circular View Transition reveal.
- Floating capsule navbar with a sliding hover indicator and an expanding mega menu; full-screen mobile menu.
- Three.js scenes (lazy-loaded, WebGL-only): pill hero, capsule-helix auth panel, 3D pack viewer and body map.
- Sticky/magnetic cursor, colour-flood buttons, scroll-progress back-to-top orb, Lenis smooth scroll on the GSAP ticker, SplitText reveals and marquees.
- Honours `prefers-reduced-motion` and Save-Data.

<img src=".github/assets/product.jpg" alt="Product page" width="100%">

## Stack

| Layer | Tech |
| --- | --- |
| Backend | PHP 8.2 · Laravel 12 · MySQL / MariaDB |
| Frontend | React 19 · Inertia.js 2 · Tailwind CSS 4 · Vite 7 · Ziggy |
| Motion & 3D | GSAP 3 (ScrollTrigger, SplitText) · Lenis · Three.js + React Three Fiber |
| Email | Resend |
| Bot protection | Google reCAPTCHA v3 + v2 |
| Quality | PHPUnit feature tests · Laravel Pint · GitHub Actions CI · Dependabot |

## Getting started

**Requirements:** PHP 8.2+ (`pdo_mysql`, `mbstring`, `gd`, `fileinfo`), Composer, Node 20+, MySQL/MariaDB. XAMPP works.

```bash
git clone https://github.com/ahmershahdev/zovita.git && cd zovita
composer install && npm install
cp .env.example .env && php artisan key:generate

# create an empty database called "zovita", then:
php artisan migrate --seed          # 1,000+ products + demo account (demo@zovita.pk / password)
php artisan storage:link
php artisan catalog:cache-images    # download images and store them locally as responsive WebP

npm run build                       # or `npm run dev` for hot reload
php artisan serve                   # → http://127.0.0.1:8000
```

**XAMPP:** clone into `htdocs/zovita` and set `APP_URL=http://localhost/zovita`. The root `.htaccess` routes requests into `public/`. In production, point the web server's document root at `public/`.

### Environment

| Key | Purpose |
| --- | --- |
| `MAIL_MAILER=resend`, `RESEND_API_KEY` | Send email through Resend. With `log`, emails are written to `storage/logs/laravel.log`. |
| `MAIL_FROM_ADDRESS` | Must be on a domain verified in Resend. |
| `RECAPTCHA_V3_SITE_KEY` / `_SECRET_KEY` | reCAPTCHA v3 keys. |
| `RECAPTCHA_V2_SITE_KEY` / `_SECRET_KEY` | reCAPTCHA v2 checkbox keys. `.env.example` ships Google's always-pass test keys. |
| `RECAPTCHA_V3_MIN_SCORE` | Score threshold (default `0.5`). |
| `ZOVITA_SUPPORT_PHONE`, `ZOVITA_SUPPORT_EMAIL`, `ZOVITA_ADMIN_EMAIL` | Contact details and where team notifications go. |
| `ZOVITA_DELIVERY_FEE`, `ZOVITA_FREE_DELIVERY_OVER` | Delivery pricing (PKR). |
| `QUEUE_CONNECTION` | `sync` locally. Use `database` + `php artisan queue:work` in production. |

### Useful commands

```bash
php artisan test                # feature tests (29)
./vendor/bin/pint               # format PHP
npm run catalog:scrape          # rebuild database/data/catalog.json from dvago.pk (rate-limited)
php artisan catalog:import      # upsert the catalog (prices, stock, details)
```

## Architecture

```
app/
├─ Actions/              PlaceOrder, StorePrescription — one job each, transactional
├─ Console/Commands/     catalog:import, catalog:cache-images
├─ Enums/                OrderStatus, PrescriptionStatus
├─ Http/
│  ├─ Controllers/       Storefront/ · Pages/ · Auth/ · Account/  (thin)
│  ├─ Middleware/        HandleInertiaRequests (shared props), SecurityHeaders
│  └─ Requests/          validation + reCAPTCHA rules, grouped by area
├─ Mail/                 Resend-delivered mailables
├─ Models/               Product, Department, Category, Brand, Order, Prescription, …
├─ Rules/Recaptcha.php   implicit v2/v3 validation rule
└─ Services/             Cart · Catalog · Mail · Security · Wishlist
config/zovita.php        store settings, contacts, upload limits
database/data/           catalog.json — source of truth for seeding
resources/
├─ css/app.css           design tokens, type system, selection, scrollbar, Lenis
├─ js/
│  ├─ Pages/             one Inertia page per file, grouped by area
│  ├─ Components/        layout/ · ui/ · product/ · motion/ · three/ · forms/
│  ├─ Layouts/           StoreLayout — persistent across visits
│  ├─ content/           FAQ + policy copy
│  └─ hooks/ · lib/      useReveal, useRecaptchaV3, gsap setup, formatting
└─ views/                app.blade.php (Inertia root) + emails/
tests/Feature/           cart, checkout, auth/account, forms/reCAPTCHA, storefront
tools/catalog/           scrape-dvago.mjs — catalog builder
```

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and the PR checklist. `main` is protected: changes land through pull requests with passing CI.

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Author

**Syed Ahmer Shah**
[ahmershah.dev](https://ahmershah.dev) · [LinkedIn](https://linkedin.com/in/syedahmershah) · [GitHub](https://github.com/ahmershahdev) · +92 370 4831994

## License

[MIT](LICENSE) © Syed Ahmer Shah. If you reuse this project, please keep attribution to **Zovita** and **Syed Ahmer Shah** in your README and public credits.

> Product names, prices and images in the demo catalog come from the public [DVAGO](https://www.dvago.pk) storefront and belong to their owners. They are included for demonstration only. Replace them with your own licensed catalog before any commercial use. Product information is not medical advice.
