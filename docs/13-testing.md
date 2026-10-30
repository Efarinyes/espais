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
- Recuperació de compte (ADR [0018](adr/0018-recuperacio-de-compte.md), [0019](adr/0019-recuperacio-sense-sessio.md)): resposta idèntica amb compte o sense; només el hash a la base; una hora; un sol ús, també amb dues confirmacions alhora (SQLite); una demanda nova anul·la l’anterior; límits per compte i per IP; correu caigut sense token viu ni dades al log; cap sessió nova; les anteriors cauen per als dos rols i el rol es manté.

## Eines

- Backend: pytest, `conftest.py` amb fakes.
- Frontend: Vitest. Noms en anglès als tests de codi; descripcions poden ser catalanes.
- Un test, un comportament. Noms `test_<acció>_<resultat>`.

## E2E de la recuperació

`tools/e2e-recuperacio.mjs` recorre la recuperació del responsable i del coordinador amb un Chrome, Brave o Chromium en mode headless, a mida de mòbil, contra una pila Docker **local** amb Mailpit. Fa l’alta, la invitació i l’acceptació pel correu, la demanda, l’enllaç, el canvi, el login amb la contrasenya nova, el rebuig de la sessió antiga i de l’enllaç usat, i la recàrrega. No imprimeix tokens. Es nega a córrer si l’app o Mailpit no són a `localhost`: crea entitats de prova.

```bash
# .env local: ESPAIS_DOMAIN=http://localhost, un ESPAIS_SECRET propi,
# ESPAIS_SMTP_HOST=mailpit i ESPAIS_SMTP_PORT=1025 (amb 587 el correu no arriba a Mailpit)
docker compose -p espais-e2e up -d --build
node tools/e2e-recuperacio.mjs
node tools/e2e-recuperacio.mjs --limits   # només amb una base nova: gasta el límit per IP d’una hora
docker compose -p espais-e2e down         # els volums espais-e2e_* queden fins que els esborris
```

El projecte `espais-e2e` té volums propis i no toca els de la pila habitual. Necessita lliures els ports 80, 443 i 8025. Si el 8025 és ocupat (per exemple, pel túnel cap al Mailpit del VPS), cal un fitxer de Compose addicional que el canviï i `ESPAIS_E2E_MAILPIT=http://127.0.0.1:<port>`. `ESPAIS_E2E_CAPTURES=<directori>` desa captures.

## TDD

A cada fase de negoci: primer el test del cas d’ús, després implementació, després API i UI.

## Què no testar

- Framework (FastAPI routing bàsic sense regla).
- Snapshot massius de CSS.
- SMTP real.

## CI (Fase 1)

Un job: tests backend + tests frontend. Branca principal protegida quan hi hagi remote.
