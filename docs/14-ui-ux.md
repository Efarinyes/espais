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

El menú d’**Avisos** només el veu el coordinador. Sense sessió, `/` és una landing merament informativa: hero a ple ample (problema i solució, fons en carrusel de fotos de sales) i «Com funciona» amb captures de l’app. **Registra l’entitat** i **Inicia sessió** van al capçal, no al cos. El títol és «Qui té la sala, a quina hora, qui vindrà?». En pantalles petites, aquesta pàgina no mostra Clar / Fosc. Amb sessió, el capçal és el mateix per als dos rols: logo Espais i Clar / Fosc, també al telèfon. El capçal no duu la paraula «Menú» ni una insígnia de rol. Els dos entren a `/espais`. El lateral mostra el nom de l’entitat i, separat del menú, la salutació **Hola,** + el nom de la persona (sense tipologia ni etiqueta de rol). El responsable hi té Espais, Calendari i Estadístiques; **Convida coordinadors** i **Tria els colors** van agrupats sota el títol Administració, i **Surt** queda al final, separat. El coordinador hi té Espais, Calendari, Avisos i **Surt**, i no veu les opcions del responsable. Per sota de `lg` (1024 px) un botó que diu **Menú** i el nom de l’entitat obre un calaix fix ancorat a l’esquerra, a tota l’alçada i amb fons de cobertura; no empeny el contingut. A `lg` el lateral continua visible. El contingut queda a la dreta a escriptori i a sota a pantalla estreta. El peu mostra any, autor, «codi obert» i «ús intern» (sense parlar de cobrament). El calendari mostra els dies oberts de les sales de la vista. Les del coordinador són la sala seleccionada o, sense sala, totes les actives. Les del responsable són totes les actives, o només la sala de `?espai=` si n’ha triat una; sense el paràmetre, la vista continua sent de tota l’entitat. El responsable pot acotar pel nom del coordinador amb `?cerca=`: és un text, no un identificador, i un nom repetit mostra totes les coincidències. El coordinador no té aquesta cerca. Graella i Llista mostren el mateix rang i el mateix àmbit; la Llista no presenta una càrrega fallida com si no hi hagués reserves. La graella va de mitja hora abans de l’obertura més d’hora a mitja hora després del tancament més tard d’aquestes sales: a la setmana, de tots els dies; en un dia (el telèfon), només d’aquell dia. Els 30 minuts s’apliquen una sola vegada, sense arrodonir (18:00–21:00 i 19:00–22:30 es veuen de 17:30 a 23:00). Schedule-X fa servir aquest mateix rang (ADR [0013](adr/0013-pedac-schedule-x-limits-minuts.md)). El gris és només el que queda fora de la franja reservable. Un tancament a les 23:59 acaba la graella a les 24:00. Un dia es mostra si hi ha almenys una sala oberta (la seleccionada, si el coordinador n’ha triat una). El dia seleccionat no es pinta sencer. Al telèfon s’obre en un dia i a l’ordinador en una setmana. La caixa cap a la pantalla i, si l’horari és llarg, el desplaçament és dins el calendari. La casella mostra un text curt: l’espai, a la reserva del coordinador; «Ocupat», a la d’un altre; el nom del coordinador, a la del responsable. El text llarg es talla. El color és la sala i, per al responsable, el tramat és el coordinador: el patró surt del nom i no canvia si al rang hi ha altres persones. Sis patrons es poden repetir, i dos coordinadors amb el mateix nom comparteixen patró. El coordinador no veu tramats ni el nom d’un altre. El títol de la pàgina continua sent «Les meves reserves» o «Totes les reserves» mentre la decisió D1 no estigui presa. El coordinador crea des d’una franja lliure o amb **Nova reserva** (espai, dia, hora i les durades ja vigents); el responsable no veu aquesta acció. La targeta d’espai del responsable continua dient «Calendari» i obre el calendari sense filtrar la sala. Arrossegar una reserva es manté on la pantalla ho permet. En clicar-la es pot canviar el dia (només els dies en què la sala es pot reservar), l’hora i el nombre d’assistents; la durada es manté. El coordinador anul·la la seva; el responsable anul·la qualsevol i el coordinador rep l’avís. Si el navegador ho permet, hi ha el botó «Instal·la». A l’iPhone s’explica: Comparteix i, després, Afegeix a la pantalla d’inici.

## Patrons Vue

- Vistes primes; lògica a composables.
- Un formulari = un composable de validació + servei injectat. Això no obliga a partir un composable només perquè és llarg.
- Estats de càrrega i error primers, no pantalles mudes.
- No amagar accions destructives en icona sense text a mòbil.

## Verificació

Quan hi hagi app: recórrer registre → espai → reserva → anul·lació en viewport mòbil, no només captura estàtica. Vegeu protocol a [15-protocol-sessio.md](15-protocol-sessio.md).
