# Espais

Aplicació web d’**ús intern** per a la gestió i reserva d’espais d’entitats diverses: clubs esportius, grups de teatre i dansa, biblioteques, associacions de veïns i qualsevol altra tipologia que necessiti controlar sales, pistes o aules.

L’ús de l’app és **gratuït**: els membres no paguen per reservar ni per usar els espais. Les activitats poden ser obertes a la ciutadania (presentació de llibre, fòrum de pel·lícula); a v1 reserva el coordinador. Una sola estructura de codi serveix totes les tipologies. Cada entitat defineix els seus espais amb nom, aforament, equipament i disponibilitat propis. No hi ha catàleg global d’espais.

## Estat actual

El projecte és a la **Fase 0 (bíblia documental)**. Encara no hi ha aplicació. El punt de partida de cada sessió és [`SESSION.md`](SESSION.md). El pla de treball a revisar és [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md).

## Com entrar al projecte

1. Llegeix [`SESSION.md`](SESSION.md) (estat viu).
2. Consulta [`docs/INDEX.md`](docs/INDEX.md) (mapa de la bíblia).
3. Obre la fase activa a [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md).
4. El model ha de cridar el skill de la feina (vegeu [`AGENTS.md`](AGENTS.md)).

## Stack previst

- Front: Vue 3 (només a `frontend/`, mobile-first). Encara no instal·lat.
- Back: FastAPI sobre l’entorn micromamba **`espais`** (ja creat en aquesta màquina). Mai `.venv`. `environment.yml` arribarà a la Fase 1 per documentar-lo; `env create` només si l’entorn no existeix.
- Tests: pytest (backend) i Vitest (frontend).

## Idioma

Documentació, glossari de domini i UI prevista: **català**.
