# Pla de treball — Espais

Document principal per revisar i tirar endavant el projecte. El desenvolupament és incremental i test-first. Cap fase comença sense el skill corresponent ni sense tests del cas d’ús.

Idioma de docs i UI: **català**. Termes estables: *entitat*, *responsable*, *coordinador*, *espai*, *reserva*, *assistència*, *aforament*.

Producte d’**ús intern** i **gratuït**. Sense passarel·la, preu de reserva ni pagament per ús: això no és una fase ni un ítem de backlog. Les activitats poden ser obertes al públic; l’autoservei de reserva per a ciutadania sense rol a l’entitat sí que és backlog.

## Criteri de fase acabada

Una fase només es tanca si:

- Els tests de la fase són verds.
- [`SESSION.md`](../SESSION.md) està actualitzat.
- S’ha passat el skill `architecture-solid`.
- No queda deute conscient sense ADR.

## Fase 0 — Bíblia (feta)

**Objectiu:** context d’arrencada estable, sense codi d’aplicació.

**Entrega:**

- README, AGENTS.md, SESSION.md, aquest pla i la resta de `docs/`.
- ADRs 0001–0005.
- Skills a `.cursor/skills/` i rules a `.cursor/rules/`.

**Fora d’abast:** `frontend/`, `backend/`, `environment.yml`, qualsevol implementació.

**Skills:** `session-start`, `session-close`, `domain-model`, `repo-github` (quan calgui preservar docs; no forma part del tancament).

## Fase 1 — Esquelet (feta)

**Objectiu:** repositori executable buit, a punt per casos d’ús.

**Tasques:**

- Git local via skill `repo-github` (ja init a la Fase 0). Branca `fase/1-esquelet`. Remot GitHub **només quan es demani**.
- **Aprofitar** l’entorn micromamba existent `espais` (no `env create`). `environment.yml` al repo amb dependències explícites. Mai `.venv`.
- Backend mínim: app FastAPI que respon salut i munta tests.
- Frontend mínim: Vue 3 + Vite **només a `frontend/`**. Pinia, Vue Router, Vitest. Tailwind + DaisyUI + PWA (ADR 0006; reaplicat a l’esquelet en Fase 3).
- CI mínima: pytest + Vitest.

**Skills:** `repo-github`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `architecture-solid`.

**Criteri fet:** `micromamba run -n espais pytest` i tests del front verds; cap dependència Vue global.

## Fase 2 — Identitat i tenant (feta)

**Objectiu:** alta d’entitat + primer responsable, sessió, aïllament per `entity_id`.

**Casos d’ús:** `RegisterEntity`, autenticació/sessió, guard de tenant.

**Tasques:**

- Onboarding: nom d’entitat, tipologia lliure, compte del responsable.
- Persistència amb `entity_id` a totes les taules de tenant.
- Front: flux de registre i inici de sessió mobile-first, empty state guiat (sense espais encara).

**Skills:** `registration-onboarding`, `backend-fastapi`, `frontend-vue`, `testing-quality`, `ui-ux-mobile`.

**Criteri fet:** un responsable pot entrar i veure només la seva entitat; tests d’aïllament de tenant.

## Fase 3 — Espais (feta)

**Objectiu:** cada entitat defineix els seus espais.

**Casos d’ús:** `CreateSpace`, `UpdateSpace`, `ListSpaces`.

**Tasques:**

- Nom local, aforament, equipament opcional, finestres de disponibilitat.
- Sense catàleg global ni coincidència d’identificadors entre entitats.
- UI de llista + alta/edició, empty state “defineix el primer espai”.

**Skills:** `spaces-definition`, `domain-model`, `ui-ux-mobile`, `testing-quality`.

**Criteri fet:** CRUD d’espais acotat a l’entitat; noms duplicats només es validen dins la mateixa entitat.

## Fase 4 — Coordinadors i reserves (feta)

**Objectiu:** el coordinador reserva un espai en un interval.

**Casos d’ús:** `InviteCoordinator`, `CreateReservation`, detecció de conflictes d’horari.

**Tasques:**

- Invitació de coordinadors (després de l’alta; no bloqueja el registre).
- Calendari/llista de disponibilitat.
- Estats: `pending` / `confirmed` (v1 pot confirmar en crear si no hi ha aprovació).
- El coordinador veu les seves reserves; el responsable les veu totes.

**Skills:** `registration-onboarding`, `reservations-attendance`, `testing-quality`.

**Criteri fet:** no es poden solapar dues reserves confirmades del mateix espai.

## Fase 5 — Assistència (feta)

**Objectiu:** el coordinador registra un nombre d’assistents.

**Casos d’ús:** `RecordAttendance`.

**Tasques:**

- `AttendanceRecord` amb estratègia `count`.
- Aforament mínim opcional a l’espai o a la reserva (si no s’assoleix, queda visible a l’anàlisi; no bloqueja v1).
- Punt d’extensió documentat per `named_list` / `accounts` (no implementar).

**Skills:** `reservations-attendance`, `domain-model`, `testing-quality`, `architecture-solid`.

**Criteri fet:** el coordinador desa un enter ≥ 0; el responsable el veu a la reserva.

Revisió `architecture-solid` (2026-09-10): neta. Capes i `entity_id` correctes; router i modal prims. Deute conscient (sense ADR): port `AttendanceStrategy` centrat en compte (ADR 0003); avisos suaus d’aforament també al composable.

## Fase 6 — Govern del responsable (feta)

**Objectiu:** el responsable reprograma o anul·la i el coordinador en queda assabentat.

**Casos d’ús:** `RescheduleReservation`, `CancelReservationByResponsible`.

**Tasques:**

- Llistat de totes les reserves de l’entitat amb participació (compte).
- Canvi d’horari amb recàlcul de conflictes (`RescheduleReservation`: mateixa fila, estat `confirmed`; avís `reservation_rescheduled`).
- Anul·lació amb confirmació a la UI.
- Avís in-app + correu al coordinador.

**Skills:** `reservations-attendance`, `notifications-cancel`, `ui-ux-mobile`, `testing-quality`.

**Criteri fet:** anul·lar dispara notificació; el coordinador la pot llegir; tests del cas d’ús d’anul·lació.

Revisió `architecture-solid` (2026-09-10): neta a capes de negoci. Deute conscient (sense ADR): no partir `useCalendariReserves` ni extraure el drag de `CalendariView` ara; split = Fase 8 si el composable torna a créixer.

## Fase 7 — Anàlisi

**Objectiu:** el responsable veu l’ús dels espais.

**Casos d’ús:** consultes d’agregació (ocupació, reserves per espai, anul·lades, assistència mitjana).

**Tasques:**

- Vistes de resum per espai i període.
- Sense cub de BI extern a v1.

**Skills:** `domain-model`, `backend-fastapi`, `ui-ux-mobile`, `testing-quality`.

**Criteri fet:** el responsable obté xifres només de la seva entitat.

## Fase 8 — Poliment

**Objectiu:** producte usable en mòbil, accessible, errors i buits clars.

**Tasques:**

- Recorregut mobile dels fluxos crítics: registre, espais, reserva, anul·lació.
- Accessibilitat bàsica (contrast, focus, etiquetes).
- Missatges d’error i empty states.
- PWA: instal·lable des de l’esquelet (ADR 0006); aquí es verifica en mòbil real.
- Split de `useCalendariReserves` / drag de `CalendariView` només si el composable torna a créixer (deute conscient; no ADR).

**Skills:** `ui-ux-mobile`, `architecture-solid`, `testing-quality`.

**Criteri fet:** verificació visual dels fluxos crítics; cap regressió de tests.

## Backlog explícit (fora de v1)

Documentat, no implementat ara:

- Transferència de responsable.
- Diversos responsables per entitat.
- Unió o fusió d’entitats.
- Coordinador amb rol en més d’una entitat.
- Assistència nominativa o comptes de participants.
- Reserva en autoservei per a ciutadania sense rol a l’entitat (a v1 reserva el coordinador, també per a actes oberts al públic).
- Aprovació de reserves pel responsable (si `pending` es vol com a flux real).
- Temes visuals per tipologia d’activitat.
- Notificació clara al dispositiu (Web Push / OS) quan el responsable canvia una reserva: properes sessions. L’avís in-app + correu (ADR 0005) ja cobreix les proves.
- Calendari en temps real via WebSocket/SSE: properes sessions. v1 és polling (ADR 0007); el port `DisparadorCalendari` ja existeix.
- Event log de reprogramacions (v1: l’interval antic/nou va al payload de l’avís).

## Ordre de skills per sessió de desenvolupament

1. `session-start`
2. Skill de domini de la fase
3. `testing-quality` (abans o amb el cas d’ús)
4. `backend-fastapi` i/o `frontend-vue` i/o `ui-ux-mobile`
5. `architecture-solid` abans de donar la fase per tancada
6. `repo-github` quan calgui preservar (commit local, qualsevol moment). Push/PR només amb remot i sota demanda
7. `session-close` (escriu `SESSION.md` i **sempre** aplica `repo-github` tancament)
