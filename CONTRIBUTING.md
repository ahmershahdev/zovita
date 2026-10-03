# Contributing to Zovita+

Thanks for helping improve Zovita+! This guide covers setup, conventions and the pull-request flow.

## Ground rules

- Be respectful and constructive.
- For anything bigger than a small fix, **open an issue first** so we can agree on the approach.
- Security issues go through [SECURITY.md](SECURITY.md), never public issues.

## Local setup

```bash
git clone https://github.com/ahmershahdev/zovita.git
cd zovita
composer install && npm install
cp .env.example .env && php artisan key:generate
# create a MySQL database named "zovita", then
php artisan migrate --seed && php artisan storage:link
npm run dev          # Vite with hot reload
php artisan serve    # http://127.0.0.1:8000
```

## Branching

The repository has a single branch, `main`. Commit and push to it directly; there are no feature branches or pull requests. Rulesets enforce this:

| Ruleset | What it does |
| --- | --- |
| `main · integrity` | `main` can't be deleted or force-pushed, and every commit must be signed (GPG key registered on GitHub) |
| `main · linear history` | no merge commits on `main` (rebase instead: `git pull --rebase`) |
| `single branch · no other branches` | no other branch can be created on GitHub |
| `release tags` | `v*` tags can't be moved or deleted |

CI runs on every push to `main`; if it goes red, fix it with the next commit.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(checkout): allow saving a default delivery address
fix(shop): ignore array-valued filter params
docs: explain Resend setup
```

## Code style

| Area | Convention |
| --- | --- |
| PHP | PSR-12 via **Laravel Pint**: run `./vendor/bin/pint` before committing |
| PHP structure | Thin controllers; business logic in `app/Actions` or `app/Services`; validation in `app/Http/Requests` |
| React | Function components, one Inertia page per file in `resources/js/Pages/<Area>/`; shared UI in `resources/js/Components/<group>/` |
| Styling | Tailwind utilities + design tokens in `resources/css/app.css`; no inline hex colours |
| Motion | GSAP via `@/lib/gsap`; always respect `prefersReducedMotion()` |
| Copy | Policy and FAQ text lives in `resources/js/content/` |

## Before pushing

```bash
./vendor/bin/pint --test   # formatting
php artisan test           # feature tests
npm run build              # production build must succeed
```

CI runs the same checks on every push to `main`.

In the commit message body, mention any new `.env` keys, migrations or commands.

## Adding tests

Feature tests live in `tests/Feature`. New behaviour, especially anything touching checkout, auth, uploads or reCAPTCHA, should come with a test. Use `Mail::fake()`, `Storage::fake()` and `Http::fake()` so tests never hit real services.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
