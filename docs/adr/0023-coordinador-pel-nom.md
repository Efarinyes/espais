# ADR 0023 — El coordinador s’identifica pel nom

- **Estat:** acceptat
- **Data:** 2026-11-13
- **Relacionat:** [0021](0021-filtre-coordinador-i-colors-sala.md), [0022](0022-sales-i-tramats-sense-xoc.md)
- **Esmena:** [0022](0022-sales-i-tramats-sense-xoc.md), només la part del tramat de coordinador

## Context

El tramat havia d’identificar qui havia fet la reserva. Amb pocs patrons, dues persones podien coincidir, i el dibuix tapava el color de la sala. El calendari del responsable ja escriu el nom del coordinador a la reserva.

## Decisió

- La sala es reconeix pel color de fons. El criteri de l’ADR 0022 per no compartir to dins l’entitat continua vigent. El mateix hex serveix en clar i en fosc.
- El coordinador es reconeix pel nom escrit a la reserva. No hi ha tramat, símbol, inicial ni color de persona, ni llegenda de coordinadors.
- El nom fa `0.75rem` i pes 500. Si no hi cap, es talla amb punts suspensius. El nom sencer queda a l’etiqueta accessible i en obrir la reserva.
- La reserva aliena del coordinador continua amb el tramat de bloqueig d’«Ocupat». No identifica cap persona.

## Conseqüències

- El nombre de coordinadors no està limitat per un repertori de dibuixos.
- El filtre `?coordinador=` es manté.

## Alternatives rebutjades

- Mantenir sis patrons fins i una llegenda de coordinadors.
- Assignar un color de persona a més del color de sala.
