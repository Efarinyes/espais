# Instruccions per al model

Aquest repositori és la bíblia del projecte Espais. El context no viu al xat: viu als arxius.

## Arrencada de cada sessió

Abans de qualsevol canvi, llegeix en aquest ordre:

1. [`SESSION.md`](SESSION.md) — fase, darrera feina, següent tasca, blockers.
2. [`docs/INDEX.md`](docs/INDEX.md) — mapa de la bíblia.
3. La fase activa a [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md).

Després crida el skill `session-start` i el skill de la feina concreta.

## Durant la feina

- Termes de domini estables: *entitat*, *responsable*, *coordinador*, *espai*, *reserva*, *assistència*, *aforament*. No barrejar sinònims.
- App d’ús intern i gratuïta. No dissenyar passarel·la, preu de reserva, pagament per ús ni camps de cobrament “per si de cas”.
- Les activitats poden ser obertes al públic; a v1 reserva només qui té rol a l’entitat. Autoservei ciutadà = backlog, no cobrament.
- Una app, moltes entitats. Tot accés a dades porta `entity_id`.
- Assistència v1: nombre d’assistents, no usuaris participants. El model ha de quedar extensible.
- SOLID i responsabilitat única. Un cas d’ús = una classe/funció de cas d’ús.
- Tests abans o amb el cas d’ús. Cap cas d’ús sense test.
- Vue 3 només a `frontend/`, mai instal·lació global. Python només amb micromamba, mai `.venv`.
- Idioma de UI i docs: català.
- Decisions noves: ADR a `docs/adr/`, no només al xat.
- En Fase 1 o posterior: esquelet i casos d’ús al repo; Vue només a `frontend/`. Python només amb micromamba, mai `.venv`.

## Skills a cridar

| Feina | Skill |
|---|---|
| Inici de sessió | `session-start` |
| Final de sessió (`SESSION.md`; sense commit) | `session-close` |
| Git local (commit, branques); GitHub només sota demanda | `repo-github` |
| Domini, glossari, model | `domain-model` |
| Alta d’entitat / responsable / coordinadors | `registration-onboarding` |
| Espais | `spaces-definition` |
| Reserves i assistència | `reservations-attendance` |
| Avís d’anul·lació | `notifications-cancel` |
| Backend Python | `backend-fastapi` |
| Frontend Vue | `frontend-vue` |
| Tests | `testing-quality` |
| Revisió SOLID / deute | `architecture-solid` |
| UI mobile-first | `ui-ux-mobile` |

Els skills viuen a [`.cursor/skills/`](.cursor/skills/). Les rules a [`.cursor/rules/`](.cursor/rules/) no els substitueixen.

## Tancament de cada sessió

Crida `session-close`: actualitza [`SESSION.md`](SESSION.md) (estat i següent punt) i comprova si hi ha canvis a preservar. No fa `git add` ni commit. Si n’hi ha, `repo-github` gestiona el repositori. Una sessió pot acabar sense commit. Si la tasca prohibeix modificar `SESSION.md`, no cridis `session-close`. Push i remot només quan es demani. Vegeu [`docs/16-repositori.md`](docs/16-repositori.md).
