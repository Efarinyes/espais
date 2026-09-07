# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 0 — Bíblia (feta)
- **Següent fase:** 1 — Esquelet (pendent)

## Darrera feina

Repositori **local** inicialitzat (`main`, `.gitignore`, primer commit). Remot GitHub ajornat fins que es demani. Skill `repo-github`: preservar = commit; no push sense `origin` ni demanda.

## Següent tasca

Arrencar la Fase 1 quan es revisi i s’aprovi [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md):

- Branca `fase/1-esquelet` en arrencar (git local ja existeix).
- Remot GitHub quan es decideixi pujar (no forma part de l’esquelet per defecte).
- Entorn micromamba (`environment.yml`).
- Esquelet FastAPI + Vue 3 només a `frontend/`.
- CI mínima de tests.

Skills a cridar a la Fase 1: `session-start`, `repo-github`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `session-close`.

## Blockers

Cap. Pendent de revisió humana del pla.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat

## Notes

- Assistència v1: compte d’assistents, extensible a llista nominativa o comptes.
- Tipologia d’entitat: text lliure, no enum tancat.
- Ús intern i gratuït. Sense passarel·la, cost de reserva ni pagament per ús. No és backlog.
- Actes oberts al públic (presentació de llibre, fòrum de pel·lícula): reserva del coordinador a v1.
- Backlog explícit (no v1): transferència de responsable, diversos responsables, unió d’entitats, coordinador en més d’una entitat, autoservei de reserva per a ciutadania.
- Git: skill `repo-github`. Ara mateix només local. Remot GitHub quan es demani. `session-close` no commiteja.
