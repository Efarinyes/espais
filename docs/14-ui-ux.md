# UI / UX (mobile-first)

Skill: `ui-ux-mobile`. Front: [11-stack.md](11-stack.md).

## Principis

- Dissenyar primer per amplada ~360–430px; millorar en escriptori (llistes en taula, calendari més ample).
- Fluxos curts: registre en una pantalla; reserva en pocs passos.
- Empty states amb una sola CTA clara.
- Confirmació explícita a anul·lacions (conseqüència: s’avisa el coordinador).
- Quatre paletes mediterrànies de l’entitat (les tria el responsable; no per tipologia). Mode clar/fosc personal al capçal. No tema “futbol” vs “teatre”.
- Glossari català a totes les cadenes. A la UI, l’anàlisi d’ús es diu **Estadístiques**.

## Design tokens

DaisyUI, ADR [0011](adr/0011-paleta-entitat-mode-personal.md) (esmena de [0010](adr/0010-aparença-paleta-mode.md)). Defecte **Mar i cel** clar. Lletra **Montserrat** (local, `@fontsource/montserrat`, pesos 400–700; no Google Fonts). Radi 12px, toc ≥ 44px (`min-h-11`). Perill maduixa `#D83A4B`. Daurats, grocs, cel clar i pedra amb text carbó, no blanc. El capçal només té Clar / Fosc; els colors de l’app es trien al tauler del responsable (columna lateral). La landing (sense sessió) usa Mar i cel.

- Mar i cel: primari `#0B5ED7`, secundari `#14B8A6`, terciari `#BFDBFE`, fons `#F1F5F9`.
- Camps i cereals: primari `#F7B955`, secundari `#6B8E5A`, terciari `#C96F4A`, fons `#EAD9C6`.
- Cítrics i sol: primari `#F97316`, secundari `#FACC15`, terciari `#4CAF50`, fons `#FFF7E6`.
- Vinyes i muntanya al mar: primari `#9B2C3D`, secundari `#8B5CF6`, terciari `#D6C8B6`; mar profund `#0F4C75` a títols i mode fosc.

Contrast WCAG AA en text normal. Focus visible. Labels lligades als inputs. Errors al costat del camp, no només toast.

## Pantalles clau

| Pantalla | Rol | Empty / error |
|---|---|---|
| Landing (`/` sense sessió) | visitant | capçal amb registre i sessió; cos informatiu |
| Registre | nou | validació inline |
| Inici responsable | responsable | tauler amb lateral; empty d’espais amb una sola CTA |
| Tria els colors | responsable | paleta al centre del tauler |
| Espais | responsable | CTA alta |
| Nova reserva | coordinador | cap espai → copy de contactar responsable |
| Les meves reserves | coordinador | encara no n’hi ha |
| Govern de reserves | responsable | encara no n’hi ha |
| Avís d’anul·lació | coordinador | detall + interval |
| Estadístiques | responsable | període sense dades; mostra d’exemple opcional |

El menú d’**Avisos** només el veu el coordinador. Sense sessió, `/` és una landing merament informativa: hero a ple ample (problema i solució, fons en carrusel de fotos de sales) i «Com funciona» amb captures de l’app. **Registra l’entitat** i **Inicia sessió** van al capçal, no al cos. Amb sessió, el **responsable** entra al tauler (`/espais`): a escriptori, administració a l’esquerra (Convida, Espais, Estadístiques; **Tria els colors** i **Surt** al final, separats de les accions) i el contingut al centre; el lateral mostra el nom de l’entitat i, separat del menú, la salutació **Hola,** + el nom de la persona (sense tipologia ni etiqueta de rol). El capçal del responsable posa **Espais** i, al costat, **Administració de** + nom de l’entitat (sense article: el nom és lliure). El coordinador conserva l’insígnia de rol. A mòbil i tauleta el menú d’admin és un `details` tancat (el summary és el nom de l’entitat), perquè el contingut de la secció quedi a sota del capçal sense un bloc vertical previ. El **calendari** és al capçal. El **coordinador** té l’inici a `/` amb la llista d’espais i **Surt** al capçal. El peu mostra any, autor, «codi obert» i «ús intern» (sense parlar de cobrament).

## Patrons Vue

- Vistes primes; lògica a composables.
- Un formulari = un composable de validació + servei injectat.
- Estats de càrrega i error primers, no pantalles mudes.
- No amagar accions destructives en icona sense text a mòbil.

## Verificació

Quan hi hagi app: recórrer registre → espai → reserva → anul·lació en viewport mòbil, no només captura estàtica. Vegeu protocol a [15-protocol-sessio.md](15-protocol-sessio.md).
