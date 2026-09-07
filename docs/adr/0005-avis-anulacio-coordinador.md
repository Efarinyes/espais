# ADR 0005 — Avís d’anul·lació al coordinador

- **Estat:** acceptat
- **Data:** 2026-09-07

## Context

Si el responsable anul·la o canvia l’horari, el coordinador ha d’avisar els participants. L’app no té els participants.

## Decisió

Canals v1: notificació **in-app** persistida + **correu**. El cas d’ús persisteix l’avís a la mateixa transacció que el canvi d’estat; l’enviament de correu és un port. Fallada SMTP no reverteix l’anul·lació.

El mateix avís s’aplica a la reprogramació feta pel responsable.

## Conseqüències

- Cal UI de safata d’avisos per al coordinador.
- Cal fake `Notifier` als tests.
- No hi ha WhatsApp ni push a v1.

## Alternatives rebutjades

- Només correu (es perd si SMTP cau o el spam filtra).
- Només in-app (el coordinador pot no obrir l’app a temps).
