# ADR 0021 — Filtre de coordinador i colors de sala

- **Estat:** acceptat
- **Data:** 2026-11-12

## Context

El calendari del responsable filtrava pel nom amb un camp de text (`?cerca=`). La llegenda ja mostra qui reserva. El text no distingia dues persones amb el mateix nom, perquè la resposta de les reserves no portava l’identificador.

Els vuit colors de sala, deixats fora de l’ADR [0020](0020-paletes-aprovades.md), tenien un blau i un violeta massa propers. La llegenda pintava el color viu i la casella, en fosc, un fons molt més fosc.

## Decisió

- El responsable tria un coordinador de l’entitat en un desplegable. La primera opció és «Tots». El valor de la URL és `?coordinador=` amb l’id. El coordinador no veu el desplegable i un `?coordinador=` a la seva URL s’esborra.
- `GET /entitat/coordinadors` el respon només el responsable: id i nom, sense correu, només el rol coordinador de la seva entitat. Una invitació no acceptada no hi surt.
- La llista de reserves del responsable inclou `coordinator_id`. La del coordinador, no: una reserva aliena continua sense nom.
- El tramat surt de l’id. Dos noms iguals no comparteixen patró.
- Els vuit colors de sala continuen lligats a l’id de l’espai. El farcit de la casella és el mateix to que el quadrat de la llegenda. El text sobre el farcit queda a 4,5:1.

## Conseqüències

- Una URL antiga amb `cerca` deixa de filtrar.
- El nom desat a la reserva pot ser anterior a un canvi de nom. El filtre segueix l’id.
- Les sales canvien de color una vegada. Afegir-ne una altra no les reordena.

## Alternatives rebutjades

- Mantenir el camp de text.
- Construir el desplegable només amb qui té una reserva a la setmana visible.
- Repartir colors segons l’ordre de la llista.
