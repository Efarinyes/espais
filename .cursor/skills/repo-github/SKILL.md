---
name: repo-github
description: Gestiona el repositori Espais (què es commiteja, commit, push, merge, tags). Use when work must be preserved, including after session-close if there are changes to keep. A session may end with no commit. Do not create a remote or push until the user asks. Never use Cursor Origin.
---

# Repo GitHub — Espais

Política: [docs/16-repositori.md](../../../docs/16-repositori.md).

Remot: **ajornat**. GitHub + `gh` només quan l’usuari ho demani. Sense `origin`, no facis push.

## Modes

| Intenció | Acció |
|---|---|
| Preservar | Commit del que és legítim, a mig de sessió o després de `session-close` si hi ha canvis a guardar. Push només si hi ha `origin` **i** s’ha demanat |
| Publicar | PR `gh pr create` cap a `main` (només amb remot i sota demanda) |
| Bootstrap local | Init + `.gitignore` + primer commit a `main`. **Sense** remote ni push |
| Bootstrap remot | Només si es demana: `gh repo create` privat + `git push -u origin main` |

No facis merge a `main` ni PR tret que sigui **publicar**.

## Després de `session-close`

Només si `session-close` ha detectat canvis a preservar. Si no n’hi ha, no facis commit.

1. No reescriguis [`SESSION.md`](../../../SESSION.md): ja l’ha tancat `session-close`.
2. Segueix el **Procediment preservar**. El pas 4 mana què es pot posar a l’stage.
3. Inclou `SESSION.md` si ha canviat, i la resta de feina legítima encara no commitejada.
4. No facis `git add -A` ni `git add .`. Fora del commit: secrets, generats (`node_modules/`, `__pycache__/`, `.mamba/`, `.venv/`, `dist/`, `coverage/`, `*.db`) i fitxers que la sessió deixa fora a propòsit.
5. **No push** tret que s’hagi demanat.
6. Torna el hash i, si queda res fora, digues què i per què. No tornis a `session-close`.

Un commit només amb `SESSION.md` (i docs de protocol) a `main` és acceptable si la fase 0 ja és a `main` i no s’ha obert `fase/…`.

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
- [ ] No tancar tu la sessió (això és `session-close`) ni fer un commit si no hi ha res a preservar

## Recursos

- [docs/16-repositori.md](../../../docs/16-repositori.md)
- [docs/PLA-TREBALL.md](../../../docs/PLA-TREBALL.md)
