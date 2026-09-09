# Sessió viva

Actualitza aquest arxiu al final de cada sessió. És el punt d’arrencada del model.

## Fase

- **Fase actual:** 5 — Assistència (al disc: `RecordAttendance`; no tancada: manca `architecture-solid` sobre assistència + modal)
- **Següent fase:** 6 — Govern del responsable (`RescheduleReservation`, `CancelReservationByResponsible`), després de tancar 5 amb la revisió SOLID

## Darrera feina

A `fase/3-espais` (el producte ja ha passat d’espais a assistència; la branca no s’ha reanomenat):

- Revisió `architecture-solid` de fases 3+4: neta. Marcades fetes a `docs/PLA-TREBALL.md`.
- Assistència: `AttendanceRecord` + port `AttendanceStrategy` / `CountAttendance` (ADR 0003). Alembic `0005`. `PUT /reserves/{id}/assistencia`. `GET /reserves` amb `attendance_count`, aforament i avisos suaus (`exceeds_capacity`, `below_min_attendance`). No bloqueja si el compte supera l’aforament.
- Permisos: només l’autor registra; el responsable veu el compte de totes; el coordinador no obre el detall d’una reserva aliena (al calendari només «Ocupat»).
- Calendari: un sol estat de modal declaratiu (`crear` | `detall`) a `CalendariModal.vue`. Formulari de desar; el modal es tanca en desar amb èxit.
- Correcció: Safari/Brave tractaven el camp com a número i el desament queia en silenci; `parseCompteAssistencia` ho normalitza.

pytest 106 verds; Vitest 68 verds.

Fase 5 **no** es tanca al pla: falta `architecture-solid` del cas d’ús nou + modal.

## Següent tasca

Revisió `architecture-solid` (capes, SRP, deute) sobre `RecordAttendance`, repositori d’assistència i modal de calendari. Si surt neta: marcar Fase 5 feta a `docs/PLA-TREBALL.md` i començar Fase 6 (reprogramar / anul·lar pel responsable + avís al coordinador). Si hi ha deute: ADR o tasca al pla, no tancar.

Skills: `architecture-solid`, `testing-quality`; després `reservations-attendance`, `notifications-cancel`, `ui-ux-mobile`.

Remot GitHub: encara sota demanda. Sense `origin`.

## Blockers

Cap. API `http://127.0.0.1:8000`; front `http://127.0.0.1:5173`.

## ADRs oberts / recents

- [0001](docs/adr/0001-multi-tenant-una-app.md) — acceptat
- [0002](docs/adr/0002-espais-definits-per-entitat.md) — acceptat
- [0003](docs/adr/0003-assistencia-per-compte.md) — acceptat
- [0004](docs/adr/0004-stack-fastapi-vue3-micromamba.md) — acceptat
- [0005](docs/adr/0005-avis-anulacio-coordinador.md) — acceptat
- [0006](docs/adr/0006-tailwind-daisy-pwa.md) — acceptat
- [0007](docs/adr/0007-calendari-polling.md) — acceptat (polling v1; sockets = adaptador futur)

Cap ADR nou pendent. Sockets/SSE de calendari: no ara; el port ja existeix.

## Notes

- Glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament.
- Ús intern i gratuït. Sense cobrament al model.
- Micromamba: `micromamba run -n espais pytest`; no `env create` si `espais` existeix.
- Front: `cd frontend && npm test` / `npm run dev`. Vue no global. Tema Daisy `espais`; toc ≥ 44px (`min-h-11`).
- PWA: instal·lable; no desregistrar el SW en DEV. `navigateFallbackDenylist` per `/salut`, `/registre`, `/sessio`, `/espais`, `/invitacions`, `/reserves`.
- Deute conscient: tancar Fase 5 amb SOLID; anul·lació/reprogramació (Fase 6) encara no. Obertura/tancament del modal de calendari una mica bruscs: retoc CSS a Fase 8 (UI), no blocker. Ocupació «disponible / parcial» al calendari = millora, no blocker.
