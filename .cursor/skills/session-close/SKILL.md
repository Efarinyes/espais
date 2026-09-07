---
name: session-close
description: Tanca una sessió del projecte Espais actualitzant SESSION.md i commitejant-lo via repo-github. Use at the end of every session. Always updates SESSION.md then applies repo-github (tancament) because SESSION.md always changes. Does not push unless the user asked.
---

# Session close — Espais

Dues passes **sempre**, en aquest ordre, **a la mateixa resposta**. No s’acaben per separat: `SESSION.md` al disc i al git han de coincidir.

1. Actualitza [`SESSION.md`](../../../SESSION.md) (i ADR si cal).
2. Aplica tot seguit el skill `repo-github` en mode **tancament**.

`session-close` no executa `git commit` ell mateix: hi delega `repo-github`. Però **no donis la sessió per tancada** fins que el commit de tancament existeixi (inclou `SESSION.md`). Sense push tret que l’usuari ho hagi demanat.

Durant la sessió, `repo-github` es pot haver cridat N vegades. Igualment al final n’hi ha una més: `SESSION.md` sempre canvia.

## Pas 1 — Estat viu

Omple les seccions existents de `SESSION.md`; no les reanomenis. No deixis decisions només al xat.

## Checklist (pas 1)

- [ ] Darrera feina descrita (què s’ha fet de veritat)
- [ ] Següent tasca concreta (un pas, no una fase sencera si no està tancada)
- [ ] Blockers actualitzats (o “cap”)
- [ ] ADRs nous enllaçats si n’hi ha
- [ ] Si s’ha tancat una fase: criteri de `PLA-TREBALL.md` complert i fase actual avançada
- [ ] Cap TODO etern sense entrada al pla o ADR
- [ ] Si ha canviat una decisió d’arquitectura o de producte: ADR nou a `docs/adr/` abans del pas 2

## Pas 2 — Git (obligatori)

Llegeix i aplica [`.cursor/skills/repo-github/SKILL.md`](../repo-github/SKILL.md), mode **tancament**.

- Millor haver preservat la feina de producte abans; el commit de tancament és el snapshot (`SESSION.md` + el que quedi sense commit).
- No push si no s’ha demanat.

## Checklist (pas 2)

- [ ] `repo-github` (tancament) executat
- [ ] `SESSION.md` és dins l’últim commit
- [ ] Working tree net (o explicat si queda alguna cosa fora de stage a propòsit)
- [ ] Hash del commit de tancament dit a l’usuari

## Recursos

- [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md)
- [docs/16-repositori.md](../../../docs/16-repositori.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
