# ADR 0019 — La recuperació de compte no obre sessió

- **Estat:** acceptat
- **Data:** 2026-10-30
- **Esmena:** [0018](0018-recuperacio-de-compte.md)
- **Relacionat:** [0014](0014-revocar-token-en-sortir.md), [0016](0016-registre-no-confirma-email.md), [0017](0017-contrasenya-i-intents-proposat.md)

## Context

L’ADR 0018 deia que, en canviar la contrasenya, se n’emetia una sessió nova i la persona quedava dins. La decisió de producte és una altra: qui recupera el compte ha d’escriure expressament les credencials noves. El token de recuperació no pot servir com a accés.

La revisió del flux sencer, amb una pila Docker local i Mailpit, va trobar a més:

- Dues confirmacions simultànies amb el mateix token passaven totes dues la comprovació.
- `POST /recuperacio` enviava el correu dins la petició. Amb un relay real, un compte existent trigaria més a respondre que un d’inexistent.
- Si `GET /sessio` responia 401, l’SPA conservava el token mort a `localStorage` i semblava connectada.
- Un enllaç obert a la mateixa pestanya de `/recuperar` només canviava el fragment: la pantalla no el llegia i el token es quedava a la barra.
- bcrypt 5 rebutja més de 72 bytes. L’alta, la invitació i la recuperació acabaven en un error 500.

## Decisió

- `POST /recuperacio/confirmacio` respon 200 amb «La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.» No retorna cap token de sessió.
- L’SPA esborra qualsevol sessió desada al navegador, no navega a l’interior de l’app i ofereix el botó «Inicia sessió». La persona entra pel login de sempre.
- Un enllaç inventat, caducat o ja usat respon 410 amb el mateix text per a tots tres casos. La pantalla ofereix «Demana un enllaç nou». Una contrasenya rebutjada respon 400 i no gasta el token.
- El token es consumeix amb una actualització condicional (`used_at IS NULL` i no caducat) dins la mateixa transacció que el canvi de contrasenya i de `session_version`. De dues confirmacions simultànies, només en guanya una. Si el canvi falla, el token no queda consumit.
- `POST /recuperacio` respon de seguida. La feina (límits, token i correu) es fa en una tasca posterior a la resposta, amb una unitat de treball pròpia. El temps de resposta no depèn de si el compte existeix.
- Els límits (3 per compte i 10 per IP en una hora) es compten després d’inserir l’intent actual. SQLite serialitza dues demandes simultànies.
- Si `GET /sessio` respon 401, l’SPA esborra la sessió local i, si la ruta l’exigia, porta a «Inicia sessió». Un error de xarxa no la toca.
- La pantalla llegeix el fragment en carregar i també quan canvia sense recarregar. El treu de la barra i de l’estat del router.
- La regla de contrasenya és comuna a l’alta, a la invitació i a la recuperació: mínim de 8 caràcters i màxim de 72 bytes (el límit de bcrypt). La resta de l’ADR 0017 continua sense aplicar-se.

## Conseqüències

- Les sessions anteriors cauen igual que a l’ADR 0018 (`session_version`). Ara no n’hi ha cap de nova fins que la persona entra.
- El que l’ADR 0018 diu del token, del fragment, dels límits, de Mailpit i del transport SMTP continua vigent.
- Una demanda que falla per la base de dades ja no dona un 500 a qui la fa: queda al log, només amb el tipus d’error.
- Els tests de cas d’ús, d’API, d’SQLite i de Vitest cobreixen el comportament. L’E2E és `tools/e2e-recuperacio.mjs` ([docs/13](../13-testing.md)).

## Alternatives rebutjades

- Mantenir l’entrada automàtica: el token del correu donaria accés sense les credencials.
- Validar el token en obrir la pàgina (petició automàtica): enviaria el token sense que la persona fes res.
- Desar el token a `sessionStorage` perquè sobrevisqui a una recàrrega: allarga la seva vida al navegador. Si es recarrega, n’hi ha prou de tornar a obrir l’enllaç del correu.
- Retallar en silenci les contrasenyes de més de 72 bytes: la persona creuria que en té una de més llarga.
