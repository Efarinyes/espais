# ADR 0024 — Verificació del correu en registrar un responsable

- **Estat:** acceptat
- **Data:** 2026-11-16
- **Relacionat:** [0016](0016-registre-no-confirma-email.md), [0018](0018-recuperacio-de-compte.md), [0019](0019-recuperacio-sense-sessio.md)

## Context

El registre creava l’entitat i el responsable i obria sessió a la mateixa resposta. El correu no es comprovava. La verificació estava al backlog de [docs/05](../05-registre-alta.md), també sense SMTP.

Els coordinadors ja demostren el correu perquè reben la invitació. La recuperació ja té un token d’un sol ús, amb hash, caducitat, consum atòmic i el mateix transport SMTP. El registre no ha de copiar aquest mecanisme en una pila nova, ni ensenyar l’enllaç a la resposta: és una petició pública, com la recuperació, i no una pantalla d’un responsable ja autenticat.

Els comptes que ja existeixen s’han d’usar sense haver de verificar-los ara.

## Decisió

- `RegisterEntity` continua sent l’alta atòmica d’entitat, usuari i membership `responsible`. Els dos queden provisionals: `users.email_verified_at` i `entities.activated_at` buits.
- `IssueEmailVerification` emet el token i l’envia. `RequestEmailVerification` el torna a demanar. `ConfirmEmailVerification` el consumeix i, a la mateixa transacció, posa les dues dates. No obre sessió.
- El token és `secrets.token_urlsafe(32)`. A la base només hi ha el SHA-256, el mateix `blind_hash` de la recuperació. Caduca al cap de 24 hores, es fa servir un sol cop i una demanda nova invalida les anteriors d’aquell compte que encara no s’han usat. El consum és l’`UPDATE` condicional de la recuperació.
- L’enllaç és `https://<ESPAIS_DOMAIN>/verificar#<token>`. La pantalla el llegeix, el treu de la barra i no l’envia fins que la persona prem «Activa el compte».
- Si no hi ha SMTP o l’enviament falla, el token es consumeix. No se’n torna cap a la resposta. El compte provisional es queda i es pot tornar a demanar l’enllaç.
- `POST /registre/verificacio` respon sempre el mateix text, en una tasca posterior a la resposta. El límit és el de la recuperació (3 per compte i 10 per IP en una hora), comptat a part amb el prefix `verificacio:` perquè una demanda no gasti l’altra.
- Una contrasenya correcta d’un compte sense verificar respon 403 amb «Verifica el correu abans d’iniciar sessió.» Una contrasenya incorrecta continua sent 401. `require_session` rebutja un Bearer d’un compte o d’una entitat encara provisionals.
- L’ADR 0016 no es reobre: un correu ja registrat continua sent 400 sense dir que existeix, també si el registre anterior encara és provisional.
- Acceptar una invitació posa `email_verified_at` al coordinador. No passa pel registre. L’entitat ja ha d’estar activa, perquè només un responsable verificat pot convidar.
- La migració `0011` copia `created_at` a `email_verified_at` i a `activated_at` de les files que ja hi havia. Els comptes de l’Alpha segueixen entrant.

## Conseqüències

- Sense `ESPAIS_SMTP_HOST` no es pot acabar un registre nou. L’Alpha amb Mailpit sí.
- La recuperació d’un compte provisional canvia la contrasenya i no el verifica.
- El reenviament i la recuperació comparteixen la taula d’intents, no el comptador.

## Alternatives rebutjades

- Ensenyar l’enllaç si no hi ha SMTP, com a la invitació: qualsevol que cridés `POST /registre` activaria el compte sense la bústia.
- Reutilitzar la taula `password_resets` amb un tipus: la confirmació de la contrasenya podria consumir un token de verificació, o a l’inrevés.
- Una sola data al usuari i cap a l’entitat: l’activació deixaria de ser una transacció que toca els dos.
- Obrir sessió en verificar: el token del correu donaria accés sense la contrasenya. L’ADR 0019 ja ho rebutja a la recuperació.
- Deixar els comptes existents sense verificar: l’Alpha deixaria d’entrar.
