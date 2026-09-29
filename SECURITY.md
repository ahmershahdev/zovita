# Security Policy

## Supported versions

Only the latest commit on `main` receives security fixes.

| Version | Supported |
| --- | --- |
| `main` (Laravel 12 + Inertia rebuild) | ✅ |
| Legacy flat-PHP site (removed) | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub:
**[Security → Report a vulnerability](https://github.com/ahmershahdev/zovita/security/advisories/new)**.

If that isn't possible, message the maintainer on [LinkedIn](https://linkedin.com/in/syedahmershah) or via [ahmershah.dev](https://ahmershah.dev), and I'll open a private advisory with you.

Please include:

- what the issue is and its impact
- steps to reproduce, or a proof of concept
- affected routes, files or versions
- any suggested fix

### What to expect

| Step | Target |
| --- | --- |
| Acknowledgement | within 72 hours |
| Triage & severity assessment | within 7 days |
| Fix for critical / high issues | as soon as possible, usually within 30 days |

Reporters are credited in the advisory unless they prefer to stay anonymous.

## Scope

In scope: the application code in this repository — authentication, checkout, prescription uploads, reCAPTCHA handling, mail, and anything that exposes customer data.

Out of scope: denial-of-service volume attacks, findings that need a compromised device or browser, missing best-practice headers without a demonstrated impact, and third-party services (Resend, Google reCAPTCHA, Fontshare).

## Security design notes

- Prescription files are stored on the **private** `local` disk under random UUID names and are never web-accessible.
- reCAPTCHA v3 (score + action check) protects login, checkout, contact, newsletter and password reset; v2 protects sign-up and prescription upload. The rule is *implicit*, so omitting the token fails validation.
- Cart prices are always re-read from the database. Stock is decremented inside a row-locked transaction.
- Sensitive endpoints are rate limited. Password-reset and newsletter responses don't reveal whether an account exists.
- Order confirmations are only visible to the session that placed the order or its owner. Order tracking requires the order number **and** the email.
- Secrets live only in `.env`, which is git-ignored. Never commit API keys.
