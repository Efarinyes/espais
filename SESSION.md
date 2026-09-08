# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 3 — Espais (en curs; CreateSpace, ListSpaces, GetSpace, UpdateSpace fets)
- **Següent fase:** 3 continua fins al criteri CRUD (finestres de disponibilitat); després 4 — Coordinadors i reserves

## Darrera feina

A `fase/3-espais`:

- Persistència SQLite: URL absoluta, bootstrap Alembic a l’arrencada (`schema.py`), `GET`/`PATCH /espais/{id}`. `UpdateSpace` / `GetSpace` acotats a l’entitat; desactivar ≠ esborrar; 404 sense filtrar altre tenant; 409 només si el nom ja existeix a l’entitat.
- Front: targeta d’espai (equipament o missatge de buit), «Editar» només responsable, empty/error de llista no es confonen. Proxy Vite: `Accept: text/html` → SPA.
- Kit UI (ADR 0006): Tailwind 4 + DaisyUI 5, tema neutre `espais`; PWA instal·lable (`vite-plugin-pwa`, lang `ca`, cache de l’esquelet). L’API no és offline. Vistes reescrites amb Daisy; composables i Pinia conservats.

Vitest 23 verds; build del front genera manifest + service worker. pytest del backend no s’ha reexecutat en el tancament.

La Fase 3 **no** es tanca: falta l’editor de finestres de disponibilitat i la revisió `architecture-solid`.

## Següent tasca

Editor de finestres d’horari per espai (TDD): el responsable defineix disponibilitat; v1 encara té el defecte 08:00–22:00 tots els dies sense UI.

Skills: `spaces-definition`, `domain-model`, `backend-fastapi`, `frontend-vue`, `ui-ux-mobile`, `testing-quality`.

Remot GitHub: encara sota demanda.

## Blockers

Cap. API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173` (Vite ja recarrega Daisy/PWA).

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat
- [0006](docs/adr/0006-tailwind-daisy-pwa.md) — acceptat

Cap ADR nou pendent.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` per `/salut`, `/registre`, `/sessio`, `/espais`.
- Revisió SOLID pendent abans de tancar la fase. Deute conscient: editor de finestres; invitacions = Fase 4; ocupació «disponible / parcial» = Fase 4 (reserves).
