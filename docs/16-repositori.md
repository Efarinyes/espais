# Repositori (local i GitHub)

Skill: `repo-github`. Aquest capítol és la política; el skill és el procediment. `session-close` **no** fa git.

## Quan cridar `repo-github`

En **qualsevol moment**, no només al tancar la sessió:

- Preservar feina a mitja sessió (commit local).
- Primer `git init` (només local, fins que es decideixi el remot).
- Obrir branca de fase o de funcionalitat.
- Més endavant: crear remot GitHub, push i PR a `main`.

`session-close` actualitza [`SESSION.md`](../SESSION.md). Si cal commit, cal cridar `repo-github` a part.

## Remot (ajornat)

De moment el repositori és **només local**. No hi ha `origin` ni push. Quan calgui pujar-lo, es farà amb GitHub i `gh` (privat per defecte, confirmar visibilitat). No Cursor Origin (`origin.cursor.com`). Fins aleshores, **preservar = només commit**.

## Branques

```
main                    estable: només feina tancada
  └── fase/N-slug       fase activa del pla (habitual de sessió)
        └── feat/slug   opcional: una funcionalitat dins la fase
```

| Branca | Ús |
|---|---|
| `main` | Entrega tancada. Mai commits a mitges. Mai `--force`. |
| `fase/N-slug` | Treball de la fase (`fase/1-esquelet`, `fase/2-identitat`). |
| `feat/slug` | Aïllar una peça (`feat/register-entity`). Merge a la `fase/…` abans del PR a `main`. |

Noms: kebab-case anglès, prefix clar. No gitflow (`develop` / `release`).

**Preservar** = commit a la branca de treball. Push només quan existeixi remot i es demani explícitament.  
**Publicar** = PR (`gh pr create`) de `fase/…` cap a `main`, només sota demanda o en tancar fase, i només amb remot.

Si hi ha canvis de producte a `main` sense commit: crear/canviar a `fase/N-slug` (N de [`SESSION.md`](../SESSION.md)) abans de commitejar. El primer commit de bootstrap (bíblia) sí que va a `main`.

## Bootstrap local (sense historial)

1. `git init -b main`
2. `.gitignore` (vegeu sota)
3. Primer commit a `main`
4. **Aturar-se.** No `gh repo create`, no `git remote`, no push, fins que es demani.

Obrir `fase/1-esquelet` en arrencar la Fase 1, no al bootstrap de la bíblia.

## `.gitignore` mínim

Incloure: `.env*`, `node_modules/`, `__pycache__/`, `.mamba/`, `.venv/` (per si algú n’havia creat un), `*.db`, `.DS_Store`.

No ignorar: `docs/`, `.cursor/`, `environment.yml` quan existeixi.

## Prohibicions

- `git config` (no canviar identitat ni config global/local des de l’agent).
- `--no-verify` / saltar hooks.
- `push --force` a `main` o `master`.
- Secrets al stage (`.env`, credencials).
- Merge a `main` sense dir-ho explícitament.
- Crear remot o fer push sense que s’hagi demanat.
