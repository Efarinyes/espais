# ADR 0009 — Purga d’avisos arxivats als 21 dies

- **Estat:** acceptat
- **Data:** 2026-09-12
- **Relacionat:** [0005](0005-avis-anulacio-coordinador.md)

## Context

El coordinador arxiva avisos ja llegits per treure’ls de la safata. Sense neteja, la taula `notifications` creix per sempre. Esborrar a mà no escala; guardar-los indefinidament no aporta valor un cop l’avís ja s’ha vist i arxivat.

## Decisió

- Retenció: **3 setmanes** (`timedelta(weeks=3)`) des de `archived_at`.
- Cas d’ús `PurgeArchivedNotifications`: elimina només files amb `archived_at` no nul i ≤ ara − 21 dies. No toca no llegits ni llegits sense arxivar.
- És una tasca de **manteniment** (mateixa regla per a totes les entitats), no una acció d’usuari. No hi ha endpoint HTTP.
- El bucle viu al lifespan de FastAPI: un cop a l’arrencada i cada 24 h. Sense Celery ni cron extern a v1.
- Els tests no engeguen el bucle (`enable_maintenance=False` per defecte a `create_app`).

## Conseqüències

- L’arxivat continua sent reversible només fins a la purga; no hi ha “restaurar”.
- Un procés aturat més de 24 h recupera la feina a la propera arrencada.
- Un worker extra tornaria a executar la mateixa DELETE idempotent.

## Alternatives rebutjades

- Esborrat immediat en arxivar (perd el marge de 3 setmanes).
- Cron/Celery (infra nova per una sola DELETE diària).
- Caducitat també dels no arxivats (el coordinador pot tenir avisos pendents de llegir).
