---
name: repo-github
description: Gestiona git local (init, branques fase/feat, commit) i, només quan es demani, GitHub. Use at any time to preserve work, and always at session-close (mode tancament) after SESSION.md is updated. Do not create a remote or push until the user asks. Never use Cursor Origin.
---

# Repo GitHub — Espais

Política: [docs/16-repositori.md](../../../docs/16-repositori.md).

Remot: **ajornat**. GitHub + `gh` només quan l’usuari ho demani. Sense `origin`, no facis push.

## Modes

| Intenció | Acció |
|---|---|
| Preservar | Commit a la branca de treball, **durant** la sessió. Push només si hi ha `origin` **i** s’ha demanat |
| Tancament | El crida `session-close` **sempre** després d’escriure `SESSION.md`. Commit que inclou `SESSION.md`. Sense push tret de demanda |
| Publicar | PR `gh pr create` cap a `main` (només amb remot i sota demanda) |
| Bootstrap local | Init + `.gitignore` + primer commit a `main`. **Sense** remote ni push |
| Bootstrap remot | Només si es demana: `gh repo create` privat + `git push -u origin main` |

No facis merge a `main` ni PR tret que sigui **publicar**.

## Mode tancament

L’invoca `session-close`. Independent dels commits fets durant la sessió: `SESSION.md` acaba de canviar.

1. Segueix el **Procediment preservar** (sota).
2. El commit **ha d’incloure** `SESSION.md`. Si hi ha més arxius sense commit, inclou’ls (arbre net). Millor que la feina grossa ja estigui commitejada abans.
3. Missatge centrat en el tancament (p. ex. actualitzar l’estat viu de sessió).
4. **No push** tret que s’hagi demanat.
5. Torna el hash. Això **compleix** el tancament; no tornis a `session-close` en bucle.

Un commit de tancament només amb `SESSION.md` (i docs de protocol) a `main` és acceptable si la fase 0 ja és a `main` i no s’ha obert `fase/…`.

## Procediment preservar

En paral·lel, després llegeix el log per l’estil de missatges:

```bash
git status
git diff && git diff --staged
git log -8 --oneline
git branch -vv
git remote -v
```

1. Si no és un repo → **Bootstrap local**.
2. Si ets a `main` amb canvis de **producte/app** (no snapshot de sessió, no el primer commit): crea/canvia a `fase/N-slug` (N de [`SESSION.md`](../../../SESSION.md)).
3. Si cal aïllar una funcionalitat dins la fase: `feat/slug` des de la `fase/…`.
4. Stage només el que toca. **Mai** `.env*`, credencials, `node_modules/`, `__pycache__/`, `.mamba/`, `*.db`.
5. Commit amb HEREDOC, 1–2 frases del *per què*. Sense `--no-verify`.
6. **No push** si no hi ha `origin` o no s’ha demanat pujar a remot.
7. Resumeix branca i hash. Si **no** vens de `session-close`, no tanquis tu la sessió.

```bash
git commit -m "$(cat <<'EOF'
Missatge aquí.

EOF
)"
```

## Bootstrap local (sense historial)

No instal·lis l’app. No creïs GitHub.

1. `git init -b main`
2. Crea `.gitignore` mínim: `.env*`, `node_modules/`, `__pycache__/`, `.mamba/`, `.venv/`, `*.db`, `.DS_Store`. No ignoris `docs/` ni `.cursor/`.
3. `git add` + primer commit a `main`.
4. Atura’t. Remot i `fase/1-esquelet` quan es demanin (Fase 1 / pujada explícita).

## Bootstrap remot (només sota demanda)

Confirma visibilitat (defecte **privat**). Si ja hi ha remote, no en creïs un altre ni canviïs l’URL.

`gh repo create` + `git remote add origin` + `git push -u origin main`.

## Publicar (PR)

Només sota demanda, amb remot existent:

- Branca `fase/…` actualitzada.
- `gh pr create` cap a `main`.
- No `push --force` a `main`.

## Prohibicions

- [ ] No `git config`
- [ ] No `--no-verify` ni `--no-gpg-sign`
- [ ] No force push a `main`/`master`
- [ ] No Cursor Origin
- [ ] No secrets al commit
- [ ] No remote ni push sense demanda explícita
- [ ] No tancar una sessió sense que `session-close` hagi passat pel mode tancament

## Recursos

- [docs/16-repositori.md](../../../docs/16-repositori.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
