# Veera AI — English at Work · PoC

Live: https://veera-production.up.railway.app (Railway, deploys automatically on every push to `main`).
The old GitHub Pages links (`kristenbubniv-prog.github.io/veera/...`) redirect there, keeping `#persona-...`.

Static site, no build step. The real site lives in `site/`:

- `site/index.html` — overview with links
- `site/funnel/` — quiz → voice trial → plan → paywall
- `site/app/` — first app session
- `site/veera-data.json` — all personalised content (a copy is built into both pages)

Root `index.html`, `app/`, `funnel/` are only redirect stubs for GitHub Pages — edit `site/`, not them.
`worker/` — the Cloudflare Worker for the AI conversation (deployed separately in Cloudflare).

Demo personas: add `#persona-a` or `#persona-b` to the funnel or app URL, e.g. `funnel/#persona-a-plan`.
