# Espais

Aplicació web d’**ús intern** per a la gestió i reserva d’espais d’entitats diverses: clubs esportius, grups de teatre i dansa, biblioteques, associacions de veïns i qualsevol altra tipologia que necessiti controlar sales, pistes o aules.

L’ús de l’app és **gratuït**: els membres no paguen per reservar ni per usar els espais. Les activitats poden ser obertes a la ciutadania (presentació de llibre, fòrum de pel·lícula); a v1 reserva el coordinador. Una sola estructura de codi serveix totes les tipologies. Cada entitat defineix els seus espais amb nom, aforament, equipament i disponibilitat propis. No hi ha catàleg global d’espais.

## Estat actual

El projecte és a la **Fase 1 (esquelet)**. Punt de partida de cada sessió: [`SESSION.md`](SESSION.md). Pla: [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md).

## Com entrar al projecte

1. Llegeix [`SESSION.md`](SESSION.md).
2. Consulta [`docs/INDEX.md`](docs/INDEX.md).
3. Obre la fase activa a [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md).
4. El model ha de cridar el skill de la feina ([`AGENTS.md`](AGENTS.md)).

## Arrencada local

Entorn micromamba **`espais`**: si ja existeix, s’usa. No `env create` a sobre. [`environment.yml`](environment.yml) el documenta; crear només si l’entorn no existeix. Mai `.venv`.

```bash
# API
micromamba run -n espais uvicorn app.main:app --app-dir backend --reload

# Tests backend
micromamba run -n espais pytest

# Front (dependències només a frontend/)
cd frontend && npm install && npm run dev

# Tests front
cd frontend && npm test
```

Salut de l’API: `GET /salut`.

## Stack

- Front: Vue 3 + Vite + TypeScript (només a `frontend/`, mobile-first).
- Back: FastAPI, SQLAlchemy 2, Alembic.
- Tests: pytest i Vitest.

## Idioma

Documentació, glossari de domini i UI: **català**.
