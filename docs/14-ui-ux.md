# UI / UX (mobile-first)

Skill: `ui-ux-mobile`. Front: [11-stack.md](11-stack.md).

## Principis

- Dissenyar primer per amplada ~360–430px; millorar en escriptori (llistes en taula, calendari més ample).
- Fluxos curts: registre en una pantalla; reserva en pocs passos.
- Empty states amb una sola CTA clara.
- Confirmació explícita a anul·lacions (conseqüència: s’avisa el coordinador).
- Una paleta neutra per a totes les tipologies. No tema “futbol” vs “teatre” a v1.
- Glossari català a totes les cadenes.

## Design tokens (v1)

Definir a CSS: color de fons, text, accent, perill (anul·lar), èxit, radi, espaiat, mida de toc ≥ 44px.

Contrast WCAG AA en text normal. Focus visible. Labels lligades als inputs. Errors al costat del camp, no només toast.

## Pantalles clau

| Pantalla | Rol | Empty / error |
|---|---|---|
| Registre | nou | validació inline |
| Inici responsable | responsable | Defineix el primer espai |
| Espais | responsable | CTA alta |
| Nova reserva | coordinador | cap espai → copy de contactar responsable |
| Les meves reserves | coordinador | encara no n’hi ha |
| Govern de reserves | responsable | encara no n’hi ha |
| Avís d’anul·lació | coordinador | detall + interval |
| Anàlisi | responsable | període sense dades |

## Patrons Vue

- Vistes primes; lògica a composables.
- Un formulari = un composable de validació + servei injectat.
- Estats de càrrega i error primers, no pantalles mudes.
- No amagar accions destructives en icona sense text a mòbil.

## Verificació

Quan hi hagi app: recórrer registre → espai → reserva → anul·lació en viewport mòbil, no només captura estàtica. Vegeu protocol a [15-protocol-sessio.md](15-protocol-sessio.md).
