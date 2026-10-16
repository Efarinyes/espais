# Espais

Aplicació web d’**ús intern** per a la gestió i reserva d’espais d’entitats diverses: clubs esportius, grups de teatre i dansa, biblioteques, associacions de veïns i qualsevol altra tipologia que necessiti controlar sales, pistes o aules.

L’ús de l’app és **gratuït**: els membres no paguen per reservar ni per usar els espais. Les activitats poden ser obertes a la ciutadania (presentació de llibre, fòrum de pel·lícula); a v1 reserva el coordinador. Una sola estructura de codi serveix totes les tipologies. Cada entitat defineix els seus espais amb nom, aforament, equipament i disponibilitat propis. No hi ha catàleg global d’espais.

## Estat actual

La **v1** està tancada (fases 0 a 8). L’Alpha Docker és independent del pla de fases: [ADR 0012](docs/adr/0012-docker-caddy-sqlite-alpha.md) i [`docs/17-desplegament-docker.md`](docs/17-desplegament-docker.md).

## Com entrar al projecte

1. Llegeix [`SESSION.md`](SESSION.md).
2. Consulta [`docs/INDEX.md`](docs/INDEX.md).
3. Consulta [`docs/PLA-TREBALL.md`](docs/PLA-TREBALL.md) per conèixer l’estat de les fases.
4. Segueix els skills i el protocol de sessió indicats a [`AGENTS.md`](AGENTS.md) i [`docs/15-protocol-sessio.md`](docs/15-protocol-sessio.md).

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

## Governança

Els skills de [`.cursor/skills/`](.cursor/skills/) són instruccions operatives. Si la feina hi cau, el model els ha d’utilitzar tots; el coneixement general no en substitueix cap. Un skill que no correspon a la tasca no s’usa. En conflicte, la jerarquia és: ADR vigent, capítol de `docs/`, skill. Si no es resol, s’atura la part conflictiva i s’informa.

`session-close` actualitza [`SESSION.md`](SESSION.md) i comprova si hi ha res a preservar. No fa commit. El repositori el gestiona `repo-github`, i una sessió pot acabar sense commit. Si la tasca prohibeix modificar `SESSION.md`, no es crida `session-close`.

El deute arquitectònic conscient va a un ADR. El d’implementació, no: es registra al seguiment del projecte. SOLID és un criteri de revisió; el nombre de línies no basta per partir un mòdul. Una decisió de producte no presa no es resol canviant el model.
