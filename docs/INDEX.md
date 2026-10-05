# Índex de la bíblia

Punt de mapa. Llegeix [`SESSION.md`](../SESSION.md) abans de qualsevol capítol.

## Pla

- [PLA-TREBALL.md](PLA-TREBALL.md) — pla de treball per fases (document a revisar per tirar endavant)

## Producte i domini

- [01-visio-producte.md](01-visio-producte.md) — visió, usuaris, fora d’abast
- [02-glossari.md](02-glossari.md) — termes estables
- [03-model-domini.md](03-model-domini.md) — entitats, relacions, estats
- [04-rols-permisos.md](04-rols-permisos.md) — responsable i coordinador
- [05-registre-alta.md](05-registre-alta.md) — onboarding i casuístiques
- [06-espais.md](06-espais.md) — definició d’espais per entitat
- [07-reserves-assistencia.md](07-reserves-assistencia.md) — reserves i compte d’assistents
- [08-notificacions.md](08-notificacions.md) — avís d’anul·lació
- [09-analisi.md](09-analisi.md) — ús dels espais per al responsable

## Tècnica

- [10-arquitectura.md](10-arquitectura.md) — capes, multi-tenant, casos d’ús
- [11-stack.md](11-stack.md) — FastAPI, Vue 3, micromamba
- [12-solid-estandards.md](12-solid-estandards.md) — SOLID i deute tècnic
- [13-testing.md](13-testing.md) — contracte de tests
- [14-ui-ux.md](14-ui-ux.md) — mobile-first, empty states, a11y
- [15-protocol-sessio.md](15-protocol-sessio.md) — arrencada, skills, deute i tancament (el tancament no és un commit)
- [16-repositori.md](16-repositori.md) — git quan hi ha feina a preservar; GitHub sota demanda; skill `repo-github`
- [17-desplegament-docker.md](17-desplegament-docker.md) — Docker Compose, Caddy, SQLite persistent (ADR 0012)

## Decisions

- [adr/0001-multi-tenant-una-app.md](adr/0001-multi-tenant-una-app.md)
- [adr/0002-espais-definits-per-entitat.md](adr/0002-espais-definits-per-entitat.md)
- [adr/0003-assistencia-per-compte.md](adr/0003-assistencia-per-compte.md)
- [adr/0004-stack-fastapi-vue3-micromamba.md](adr/0004-stack-fastapi-vue3-micromamba.md)
- [adr/0005-avis-anulacio-coordinador.md](adr/0005-avis-anulacio-coordinador.md)
- [adr/0006-tailwind-daisy-pwa.md](adr/0006-tailwind-daisy-pwa.md)
- [adr/0007-calendari-polling.md](adr/0007-calendari-polling.md)
- [adr/0008-responsable-no-crea-reserves.md](adr/0008-responsable-no-crea-reserves.md)
- [adr/0009-purga-avisos-arxivats.md](adr/0009-purga-avisos-arxivats.md)
- [adr/0010-aparença-paleta-mode.md](adr/0010-aparença-paleta-mode.md)
- [adr/0011-paleta-entitat-mode-personal.md](adr/0011-paleta-entitat-mode-personal.md)
- [adr/0012-docker-caddy-sqlite-alpha.md](adr/0012-docker-caddy-sqlite-alpha.md)
- [adr/0013-pedac-schedule-x-limits-minuts.md](adr/0013-pedac-schedule-x-limits-minuts.md)

## Skills i rules

Els skills del model són a [`.cursor/skills/`](../.cursor/skills/). Les rules persistents a [`.cursor/rules/`](../.cursor/rules/) no els substitueixen. Quin skill toca a cada feina: [`AGENTS.md`](../AGENTS.md). Precedència i ús obligatori: [15-protocol-sessio.md](15-protocol-sessio.md).
