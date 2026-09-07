---
name: repo-github
description: Gestiona git local (init, branques fase/feat, commit) i, només quan es demani, GitHub (remote, push, PR). Use at any time to preserve work locally. Do not create a remote or push until the user asks. Never use Cursor Origin. session-close does not run this skill.
---

# Repo GitHub — Espais

Skill **separat** de `session-close`. Crida’l en qualsevol moment per preservar (local) o, més endavant, publicar. Política: [docs/16-repositori.md](../../../docs/16-repositori.md).

Remot: **ajornat**. GitHub + `gh` només quan l’usuari ho demani. No `origin.cursor.com`. Sense `origin`, no facis push.

## Modes

| Intenció | Acció |
|---|---|
| Preservar | Commit a la branca de treball. Push només si hi ha `origin` **i** s’ha demanat |
| Publicar | PR `gh pr create` cap a `main` (només amb remot i sota demanda) |
| Bootstrap local | Init + `.gitignore` + primer commit a `main`. **Sense** remote ni push |
| Bootstrap remot | Només si es demana: `gh repo create` privat + `git push -u origin main` |

No facis merge a `main` ni PR tret que sigui **publicar**.

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
2. Si ets a `main` amb canvis de producte (no el primer commit): crea/canvia a `fase/N-slug` (N de [`SESSION.md`](../../../SESSION.md)). No commitegis a mitges a `main`.
3. Si cal aïllar una funcionalitat dins la fase: `feat/slug` des de la `fase/…`.
4. Stage només el que toca. **Mai** `.env*`, credencials, `node_modules/`, `__pycache__/`, `.mamba/`, `*.db`.
5. Commit amb HEREDOC, 1–2 frases del *per què*. Sense `--no-verify`.
6. **No push** si no hi ha `origin` o no s’ha demanat pujar a remot.
7. Resumeix branca i hash. No tanquis la sessió: això no substitueix `session-close`.

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
- [ ] No substituir `session-close`

## Recursos

- [docs/16-repositori.md](../../../docs/16-repositori.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
