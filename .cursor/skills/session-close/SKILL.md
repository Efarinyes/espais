---
name: session-close
description: Tanca una sessió del projecte Espais actualitzant SESSION.md i registrant decisions. Use at the end of every session, before stopping work, or when the user says the session is done. Does not commit, push, or open PRs; call repo-github to preserve or publish.
---

# Session close — Espais

## Obligatori

Actualitza [`SESSION.md`](../../../SESSION.md). No deixis decisions només al xat.

**Aquest skill no toca git.** No facis `commit`, `push` ni PR aquí. Si cal preservar o publicar, crida `repo-github` (en qualsevol moment, també després d’aquest tancament). Vegeu [docs/16-repositori.md](../../../docs/16-repositori.md).

## Checklist

- [ ] Darrera feina descrita (què s’ha fet de veritat)
- [ ] Següent tasca concreta (un pas, no una fase sencera si no està tancada)
- [ ] Blockers actualitzats (o “cap”)
- [ ] ADRs nous enllaçats si n’hi ha
- [ ] Si s’ha tancat una fase: criteri de `PLA-TREBALL.md` complert i fase actual avançada
- [ ] Cap TODO etern sense entrada al pla o ADR
- [ ] Git: no s’ha fet commit/push en aquest skill; si cal, s’ha dit de cridar `repo-github`

## Plantilla

Omple les seccions existents de `SESSION.md`; no les reanomenis.

Si ha canviat una decisió d’arquitectura o de producte, crea el següent ADR a `docs/adr/` abans de tancar.

## Recursos

- [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
- [docs/16-repositori.md](../../../docs/16-repositori.md)
- Skill `repo-github`