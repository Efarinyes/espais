# ADR 0015 — Capçaleres HTTP i OpenAPI en producció

- **Estat:** acceptat
- **Data:** 2026-10-21
- **Relacionat:** [0012](0012-docker-caddy-sqlite-alpha.md)

## Context

L’auditoria del 16 d’octubre de 2026 va veure que Caddy no enviava capçaleres de vora i que `/api/docs` i `/api/openapi.json` responien 200. El `Caddyfile` comprimeix, treu el prefix `/api` i serveix la SPA. FastAPI obria la documentació sempre.

La SPA i l’API comparteixen origen. El tema inicial llegia `localStorage` amb un script dins l’HTML. Els estils en línia venen dels atributs `style` de Vue (calendari, paleta, barres d’ocupació). La lletra, les fotos i el service worker són del mateix origen. El registre del service worker ja és un fitxer, no un script en línia. En local, `ESPAIS_DOMAIN=http://localhost` és HTTP.

## Decisió

- Caddy afegeix, a la SPA i a l’API, `Strict-Transport-Security` (`max-age=15552000`, sense `includeSubDomains` ni `preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` i una `Content-Security-Policy` que només admet recursos del mateix origen. Els estils en línia es permeten. Els scripts en línia, no.
- El script del tema surt a `frontend/public/tema-inicial.js` perquè la política de scripts el pugui carregar.
- `handle_path /api/*` i `reverse_proxy backend:8000` no canvien. FastAPI segueix sense el prefix `/api`.
- Amb `ESPAIS_ENV=production`, FastAPI no publica `/docs`, `/redoc` ni `/openapi.json`. `/salut` continua obert. Fora de producció la documentació es manté, per al desenvolupament local.
- Sense WAF i sense una autenticació nova.

## Conseqüències

- Un navegador ignora HSTS si la resposta arriba per HTTP. A `http://localhost` la capçalera no força HTTPS.
- La CSP no es comprova al servidor de Vite: només la posa Caddy.
- Operació a [`docs/17-desplegament-docker.md`](../17-desplegament-docker.md).

## Alternatives rebutjades

- `script-src 'unsafe-inline'`: la pàgina tornaria a executar qualsevol script injectat, que és el que la capçalera ha d’evitar.
- `upgrade-insecure-requests`: a l’HTTP local la SPA demanaria HTTPS i deixaria de carregar.
- Protegir `/docs` amb una clau nova: és una autenticació que aquest canvi no obre.
- Tancar la documentació també en desenvolupament: el local deixa de poder consultar el contracte sense produir.
