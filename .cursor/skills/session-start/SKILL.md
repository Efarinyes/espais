---
name: session-start
description: Arrenca una sessió del projecte Espais llegint l’estat viu i la fase activa. Use at the start of every session, before any code or doc change, or when the user asks to continue the project.
---

# Session start — Espais

## Obligatori abans de qualsevol canvi

Llegeix, en aquest ordre:

1. [`SESSION.md`](../../../SESSION.md)
2. [`docs/INDEX.md`](../../../docs/INDEX.md)
3. La fase activa a [`docs/PLA-TREBALL.md`](../../../docs/PLA-TREBALL.md)

Després resumeix en 3–5 línies: fase, darrera feina, següent tasca, blockers. No reinventis l’abast.

Identifica a [`AGENTS.md`](../../../AGENTS.md) quins skills apliquen, llegeix-los i segueix-los tots. El coneixement general no els substitueix. No n’apliquis un que no toqui. Conflictes, ADR i deute: [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md).

## Checklist

- [ ] `SESSION.md` llegit
- [ ] Fase del pla identificada
- [ ] Skills aplicables identificats i llegits (`AGENTS.md`); cap d’inaplicable forçat
- [ ] Si fase 0: cap codi d’aplicació
- [ ] Termes del glossari: entitat, responsable, coordinador, espai, reserva, assistència, aforament

## Després

Aplica els skills que hagis identificat. A mitja sessió, `repo-github` només si hi ha feina a preservar. Al final, `session-close` si la tasca permet modificar `SESSION.md`. No és un commit.

## Recursos

- [AGENTS.md](../../../AGENTS.md)
- [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md)
