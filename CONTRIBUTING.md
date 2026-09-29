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

`main` is the only long-lived branch and is protected by a ruleset. Work on a short-lived branch and open a pull request:

| Prefix | Use for |
| --- | --- |
| `feat/…` | new features |
| `fix/…` | bug fixes |
| `refactor/…` | code changes with no behaviour change |
| `docs/…` | documentation |
| `chore/…` | tooling, dependencies, CI |

Pull requests are **squash-merged**, and branches are deleted automatically after merge.

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

## Before opening a PR

```bash
./vendor/bin/pint --test   # formatting
php artisan test           # feature tests
npm run build              # production build must succeed
```

CI runs the same checks on every pull request. They must pass before merge.

In your PR description:

- explain **what** changed and **why**
- link the issue (`Closes #12`)
- add screenshots or a short clip for UI changes (desktop + mobile)
- mention any new `.env` keys, migrations or commands

## Adding tests

Feature tests live in `tests/Feature`. New behaviour, especially anything touching checkout, auth, uploads or reCAPTCHA, should come with a test. Use `Mail::fake()`, `Storage::fake()` and `Http::fake()` so tests never hit real services.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
