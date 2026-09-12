# Testing

Skill: `testing-quality`. Contracte: **cap cas d’ús sense test**.

## Piràmide

1. Unitari de cas d’ús / domini (majoritari): fakes de repositori, clock, notifier.
2. Adaptador: SQLAlchemy amb SQLite en memòria; un cas d’aïllament de tenant.
3. API: TestClient FastAPI pels fluxos d’auth i permisos.
4. Front: composables i components dels fluxos crítics (registre, reserva, anul·lació).
5. E2E complet: només Fase 8 si aporta valor; no bloqueja fases 1–7.

## Fluxos que sempre han de tenir test

- `RegisterEntity` atòmic; email duplicat; no entitat òrfena.
- Tenant: usuari d’A no llegeix espais/reserves de B.
- Unique nom d’espai per entitat; duplicate permès entre entitats.
- Solapament de reserves confirmades.
- `RecordAttendance` amb `count`; estratègia extensible no trenca.
- `CancelReservationByResponsible` persisteix avís i crida `Notifier`.
- Fallada de correu no reverteix l’anul·lació.
- `ArchiveNotification`: només el destinatari; només avisos ja llegits; tenant A no arxiva B.
- `PurgeArchivedNotifications`: elimina només arxivats de fa ≥ 3 setmanes; no toca no llegits ni llegits sense arxivar.
- `GetUsageSummary`: només el responsable; tenant A no veu B; `cancelled` no entra a ocupació; assistència sense zero silenciós.

## Eines

- Backend: pytest, `conftest.py` amb fakes.
- Frontend: Vitest. Noms en anglès als tests de codi; descripcions poden ser catalanes.
- Un test, un comportament. Noms `test_<acció>_<resultat>`.

## TDD

A cada fase de negoci: primer el test del cas d’ús, després implementació, després API i UI.

## Què no testar

- Framework (FastAPI routing bàsic sense regla).
- Snapshot massius de CSS.
- SMTP real.

## CI (Fase 1)

Un job: tests backend + tests frontend. Branca principal protegida quan hi hagi remote.
