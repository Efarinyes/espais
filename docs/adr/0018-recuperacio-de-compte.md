# ADR 0018 — Recuperació de compte per correu

- **Estat:** acceptat; esmenat per [0019](0019-recuperacio-sense-sessio.md)
- **Data:** 2026-10-29
- **Relacionat:** [0014](0014-revocar-token-en-sortir.md), [0016](0016-registre-no-confirma-email.md), [0012](0012-docker-caddy-sqlite-alpha.md)

## Context

Si una persona perd la contrasenya, no pot tornar a entrar. El registre no pot oferir recuperació (ADR 0016): diria si el correu té compte. L’enllaç només va a «Inicia sessió».

El mateix compte serveix per al responsable i per al coordinador. No cal un flux per rol.

A l’Alpha el correu el captura Mailpit al VPS. No surt cap missatge a destinataris externs. El transport SMTP és el mateix que podrà fer servir un relay més endavant, sense canviar el cas d’ús.

## Decisió

Esmenat per l’ADR [0019](0019-recuperacio-sense-sessio.md): la confirmació no obre cap sessió i la persona entra pel login. La resta d’aquest apartat continua vigent.

- `POST /recuperacio` respon sempre el mateix text, tant si el compte existeix com si s’ha passat el límit o el correu no ha sortit.
- El token és `secrets.token_urlsafe(32)`. A la base només hi ha el SHA-256. Caduca al cap d’una hora, es fa servir un sol cop i una demanda nova invalida les anteriors d’aquell compte que encara no s’han usat.
- L’enllaç és `https://<ESPAIS_DOMAIN>/recuperar#<token>`. El fragment no arriba a Caddy ni a FastAPI. La pantalla el llegeix, el treu de la barra i el guarda només a memòria.
- Límit silenciós: 3 demandes per compte i hora, i 10 per IP i hora, també per a correus que no existeixen. El recompte és a SQLite. Caddy reescriu `X-Forwarded-For` amb la IP real. El backend només la fa servir si el company de la connexió és una adreça privada o de loopback.
- La contrasenya nova segueix el mínim de 8 caràcters. No s’aplica l’ADR 0017.
- Un canvi correcte puja `users.session_version`. El token HMAC de sessió porta `ver`. `require_session` el compara. Un token d’abans del canvi deixa de valer. Se n’emet un de nou i la persona queda dins. Un token antic sense `ver` compta com a versió 0: les sessions d’abans d’aquest canvi segueixen vàlides fins que algú recuperi el compte.
- Si el correu no està configurat o l’enviament falla, el token es marca com a usat. No en queda cap de viu. La resposta continua sent la genèrica. El log no porta el token ni la contrasenya.
- Invitacions i avisos d’anul·lació o reprogramació comparteixen el transport SMTP. Amb Mailpit, també hi passen. Si l’enviament de la invitació funciona, l’enllaç copiable continua amagat.
- Mailpit no és públic. La interfície només escolta a `127.0.0.1:8025`. El port SMTP 1025 no es publica. No hi ha volum: els missatges es perden en recrear el contenidor.

## Conseqüències

- Activar `ESPAIS_SMTP_HOST` treu les invitacions i els avisos del camí de log i enllaç copiable. A l’Alpha, Mailpit els captura.
- Al `.env` del VPS cal `ESPAIS_SMTP_HOST=mailpit` i `ESPAIS_SMTP_PORT=1025`. Un port `587` ja escrit no es substitueix sol.
- L’ADR 0017 continua proposat. L’ADR 0016 no es reobre: el registre no parla de recuperació.

## Alternatives rebutjades

- Posar el token al camí o a la query: quedaria al log d’accés de Caddy.
- Ensenyar l’enllaç a la resposta, com a la invitació: qualsevol que demani un correu el rebria.
- Redis per als límits: SQLite ja és la base de l’Alpha.
- Una llista de totes les sessions emeses: el HMAC no en guarda el registre. La versió al usuari i al token és el que les invalida totes.
