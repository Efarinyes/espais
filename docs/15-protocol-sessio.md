# Protocol de sessió

El model no depèn de la memòria del xat. L’estat viu és [`SESSION.md`](../SESSION.md).

## Arrencada

1. Llegir [`SESSION.md`](../SESSION.md).
2. Llegir [`docs/INDEX.md`](INDEX.md).
3. Obrir la fase activa a [`PLA-TREBALL.md`](PLA-TREBALL.md).
4. Cridar el skill `session-start`.
5. Cridar els skills que apliquen (taula a [`AGENTS.md`](../AGENTS.md) i secció següent).
6. Si la fase és 0, no generar codi d’aplicació.

## Skills i precedència

Els skills de [`.cursor/skills/`](../.cursor/skills/) són instruccions operatives. No són documentació opcional, ni recomanacions, ni exemples. La taula de quin skill toca és a [`AGENTS.md`](../AGENTS.md). Les rules recorden invariants; no substitueixen el skill.

Abans de modificar res:

1. Identifica quins skills de la taula apliquen a la tasca.
2. Llegeix-los i segueix-ne les instruccions durant l’execució. Si n’hi ha més d’un, aplica’ls tots. No n’escullis un de sol.
3. No n’apliquis un que no toqui la tasca.

El coneixement general pot afegir-se. No substitueix ni contradiu un skill aplicable. No val «sé fer-ho d’una altra manera, per tant no cal el skill».

Si dos skills aplicables es contradiuen:

1. Aplica la jerarquia de sota.
2. Consulta les rules i els ADR del tema.
3. No triïs en silenci la lectura que prefereixis.

Si la jerarquia no resol el conflicte, atura la part conflictiva i informa’n. No improvisis una regla nova.

Jerarquia:

1. **ADR vigent:** estat acceptat, i que no estigui esmenat, substituït ni obsolet. Un ADR esmenat o substituït no és la decisió actual; s’aplica l’ADR que el substitueix. El que l’ADR esmenat declara que continua vigent (per exemple els tokens de l’[0010](adr/0010-aparença-paleta-mode.md)) sí que s’aplica.
2. **Capítol de docs** del tema (política de producte, domini o arquitectura).
3. **Skill** operatiu. No pot contradir 1 ni 2 en silenci. Si ho fa, segueix 1 i 2.

Una rule que contradigui un ADR vigent o el capítol del tema no guanya.

Si un ADR vigent ja no sembla adequat, no el reescriguis i no implementis una arquitectura que el contradigui. Informa que cal revisar la decisió.

## Deute

Deute arquitectònic conscient: una decisió que afecta l’arquitectura, el disseny estructural o l’evolució del sistema. Per exemple, ajornar una separació, mantenir una arquitectura que se sap que serà substituïda, acceptar una dependència arquitectònica temporal, o quedar-se una solució havent-hi una alternativa arquitectònica coneguda. Ha d’estar documentat en un ADR.

Deute d’implementació: una refactorització petita, una millora visual, una optimització, neteja, una millora menor de test, una duplicació coneguda encara no resolta, o una tasca tècnica sense implicació arquitectònica. No requereix ADR. Es registra al seguiment del projecte (pla o notes de sessió).

Ni el deute ja documentat, ni una millora opcional, ni una preferència de l’agent són una violació a corregir sols. Un deute ja anotat al pla i encara no classificat no el reclassifiquis ni el moguis a un ADR pel teu compte.

## Decisions de producte no resoltes

Si una inconsistència depèn d’una decisió de producte o de domini que no està presa, no la resolguis. No canviïs el model ni el comportament per fer-lo coherent. Informa on es produeix i quina decisió falta. L’estat `rescheduled` és un cas d’aquests: no el modifiquis pel teu compte.

## Durant

- Decisions noves → ADR a `docs/adr/` (següent número).
- Canvi de glossari → [02-glossari.md](02-glossari.md) al mateix PR/sessió.
- Deute arquitectònic conscient → ADR. Deute d’implementació → seguiment del projecte, sense ADR. No obris una refactorització pel teu compte.
- Cridar `testing-quality` amb cada cas d’ús; `architecture-solid` abans de tancar fase.
- Git a part **durant** la sessió: `repo-github` només quan hi ha feina a preservar. Push i PR només amb remot i demanda. Vegeu [16-repositori.md](16-repositori.md).

## Tancament

`session-close` tanca la sessió de treball. No és un commit. `repo-github` gestiona el repositori.

Si la tasca prohibeix modificar `SESSION.md` (auditoria, revisió, governança): no cridis `session-close`, no simulís el tancament i no toquis `SESSION.md`. Acaba amb l’informe.

Si la tasca permet `SESSION.md`:

1. Cridar `session-close` (què s’ha fet, estat, següent punt, canvis pendents de preservar).
2. Si s’ha tancat una fase, marcar-la al pla i deixar la següent com a actual.
3. Si hi ha canvis a preservar: `repo-github` (commit i, si es demana, push). Si no n’hi ha, la sessió acaba sense commit.
4. No deixar el “què falta” només al xat.

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
