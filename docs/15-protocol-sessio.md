# Protocol de sessió

El model no depèn de la memòria del xat. L’estat viu és [`SESSION.md`](../SESSION.md).

## Arrencada

1. Llegir [`SESSION.md`](../SESSION.md).
2. Llegir [`docs/INDEX.md`](INDEX.md).
3. Obrir la fase activa a [`PLA-TREBALL.md`](PLA-TREBALL.md).
4. Cridar el skill `session-start`.
5. Cridar el skill de la feina (taula a [`AGENTS.md`](../AGENTS.md)).
6. Si la fase és 0, no generar codi d’aplicació.

## Durant

- Decisions noves → ADR a `docs/adr/` (següent número).
- Canvi de glossari → [02-glossari.md](02-glossari.md) al mateix PR/sessió.
- Deute conscient → ADR o tasca al pla, no comentari `TODO` solt.
- Cridar `testing-quality` amb cada cas d’ús; `architecture-solid` abans de tancar fase.
- Git a part: cridar `repo-github` quan calgui preservar (commit local). Push i PR només quan hi hagi remot i es demani. Vegeu [16-repositori.md](16-repositori.md).

## Tancament

1. Cridar `session-close` (només context: `SESSION.md`, ADRs). **No** fa git.
2. Actualitzar `SESSION.md`: fase, darrera feina, següent tasca, blockers, ADRs.
3. Si s’ha tancat una fase, marcar-la al pla i deixar la següent com a actual.
4. Si cal preservar o publicar, cridar `repo-github` (no forma part de `session-close`).
5. No deixar el “què falta” només al xat.

## Plantilla de `SESSION.md`

```markdown
## Fase
- **Fase actual:**
- **Següent fase:**

## Darrera feina

## Següent tasca

## Blockers

## ADRs oberts / recents

## Notes
```
