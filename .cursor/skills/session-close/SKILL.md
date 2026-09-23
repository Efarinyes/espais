---
name: session-close
description: Tanca la sessió de treball d'Espais actualitzant SESSION.md. Use at the end of a session unless the task forbids changing SESSION.md. Does not commit; preserving the repo is repo-github.
---

# Session close — Espais

Tancament de la sessió de treball. No és un commit.

No facis `git add`, `git commit`, `push`, `merge` ni tags. No decideixis què entra al repositori. Això és [`repo-github`](../repo-github/SKILL.md).

Si la tasca prohibeix modificar [`SESSION.md`](../../../SESSION.md), no executis aquest skill, no el simulís i no toquis `SESSION.md`. Acaba amb l’informe de la feina.

## Què fa

1. Revisa què s’ha fet de veritat.
2. Actualitza `SESSION.md`: estat actual i següent punt de treball. No en reanomenis les seccions. No deixis decisions només al xat.
3. Comprova si hi ha canvis pendents de preservar.
4. Informa de qualsevol cosa que impedeixi donar la sessió per tancada.

## Després

Actualitzar `SESSION.md` al disc no obliga un commit.

Hi ha canvis que s’han de preservar al repositori: digues-ho. A continuació s’aplica `repo-github`. Ell decideix què entra al commit. Tu no fas `git add`.

No n’hi ha (anàlisi, o feina que no ha d’entrar al git): la sessió s’acaba aquí. No cridis `repo-github` només perquè la sessió es tanca.

## Checklist

- [ ] Darrera feina descrita (què s’ha fet de veritat)
- [ ] Següent tasca concreta (un pas, no una fase sencera si no està tancada)
- [ ] Blockers actualitzats (o «cap»)
- [ ] Deute arquitectònic conscient d’aquesta sessió: ADR, no una nota solta. No reescriguis un ADR vigent
- [ ] Deute d’implementació: al seguiment del projecte, sense ADR
- [ ] Si s’ha tancat una fase: criteri de `PLA-TREBALL.md` comprovat i fase actual avançada
- [ ] Dit si cal `repo-github` o si la sessió acaba sense commit
- [ ] Dit qualsevol bloqueig per no donar la sessió per tancada

## Recursos

- [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md)
- [docs/16-repositori.md](../../../docs/16-repositori.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
