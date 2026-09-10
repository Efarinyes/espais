# Visió de producte

## Problema

Entitats molt diferents (clubs de futbol sala, grups de teatre, dansa, biblioteques, associacions de veïns) necessiten controlar qui usa quin espai, quan, i amb quina ocupació. Cada una anomena i configura els espais a la seva manera. Un catàleg únic d’espais no escala i genera coincidències falses.

## Solució

Aplicació web d’**ús intern** de cada entitat: la fan servir el responsable i els coordinadors. Una sola base de codi, multi-tenant, on cada **entitat** defineix els seus **espais** (nom local, aforament, equipament, disponibilitat). Els **coordinadors** reserven i registren assistència (nombre). El **responsable** veu totes les reserves, l’ús, i pot canviar horaris o anul·lar, amb avís al coordinador.

L’ús de l’app és **gratuït**. Els membres no paguen per reservar ni per usar els espais a través de l’app. Les activitats poden ser obertes a la ciutadania (presentació de llibre, fòrum de pel·lícula, taller de barri): a v1 la reserva la fa igualment un coordinador de l’entitat.

## Principis

- Ús intern i gratuït. Sense preu de reserva, sense pagament per ús, sense passarel·la de pagament. El cobrament no és backlog ni una extensió a dissenyar “per si de cas”.
- L’eina és interna; els espais poden servir activitats obertes al públic. Els assistents no cal que tinguin compte (assistència per nombre).
- Una estructura de codi, moltes tipologies. La tipologia és un atribut lliure, no un producte diferent.
- Els espais no es comparteixen ni s’unifiquen entre entitats.
- Mobile-first: el coordinador reserva des del telèfon.
- El responsable governa i analitza; no cal que creï cada reserva.
- Extensible sense reescriure el nucli (assistència, rols extra, més d’una entitat per persona, autoservei ciutadà). No s’hi inclou cobrament.

## Usuaris v1

| Rol | Necessitat principal |
|---|---|
| Responsable de l’entitat | Alta de l’entitat i espais; visió global; reprogramar/anul·lar; anàlisi d’ús |
| Coordinador d’activitat | Reservar un espai; registrar el nombre d’assistents; rebre avisos d’anul·lació |

No hi ha participants amb compte a v1. Vegeu [07-reserves-assistencia.md](07-reserves-assistencia.md).

## Escenaris d’exemple

- Club de futbol sala: pistes i vestidors amb aforament i horaris d’entrenament.
- AAVV barri A: Sala 1, Sala 2, Sala 3 (reunions internes i actes oberts al barri).
- AAVV barri B: sales amb noms de personatges del barri. Mateixa app, identificadors diferents.
- Biblioteca: sales d’estudi i sala per a una presentació de llibre o un fòrum de pel·lícula; el coordinador reserva l’espai, el públic assisteix sense compte a l’app.
- Grup de teatre: sala d’assaig amb equipament (llums, piano).

## Fora d’abast v1

Peces de producte que sí són backlog explícit a [PLA-TREBALL.md](PLA-TREBALL.md) (es poden abordar més endavant, sense dissenyar-les ara):

- App nativa.
- Temes visuals per tipologia d’activitat.
- Participants amb compte, llista nominativa d’assistència.
- Reserva en autoservei per a ciutadania sense rol a l’entitat (el veí o l’usuari de biblioteca reserva ell mateix, sense ser coordinador). A v1 només reserva el **coordinador**; l’acte pot ser igualment obert al públic. El responsable reprograma o anul·la.
- Diversos responsables, transferència de rol, fusió d’entitats, coordinador multi-entitat.

El cobrament (passarel·la, cost de la reserva, pagament per ús, facturació) **no forma part del producte ni del backlog**. Si un dia calgués, es faria un estudi específic i s’adaptaria aleshores; no es reserva lloc al model ni a la UI.
