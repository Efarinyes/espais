# ADR 0025 — Verificació del login per Socket.IO

- **Estat:** acceptat
- **Data:** 2026-11-18
- **Relacionat:** [0007](0007-calendari-polling.md), [0012](0012-docker-caddy-sqlite-alpha.md), [0014](0014-revocar-token-en-sortir.md), [0017](0017-contrasenya-i-intents-proposat.md), [0019](0019-recuperacio-sense-sessio.md), [0024](0024-verificacio-correu-responsable.md)

## Context

`POST /sessio` validava l’email i la contrasenya i, si eren correctes, tornava el token HMAC a la mateixa resposta. Cal un segon pas, lligat a la finestra que ha iniciat el login, sense correu, SMS, Web Push ni una aplicació autenticadora. El calendari continua en polling (ADR 0007). L’Alpha segueix amb un sol worker i sense Redis (ADR 0012).

## Decisió

- `AuthenticateUser` no canvia. `POST /sessio` el crida i, si les credencials són correctes, **no** emet el token. Respon `challenge_id` i `expires_at`.
- El navegador obre Socket.IO a `/api/socket.io` (Caddy i Vite treuen `/api`, com la resta de l’API). En connectar, el servidor crea un secret de canal i l’envia només a aquell `sid`, a l’esdeveniment `verificacio:canal`. El client el torna a `POST /sessio`. No s’accepta un identificador de socket triat pel navegador.
- El codi és de 6 dígits. Al procés només se’n guarda el SHA-256, junt amb el hash del canal. El text clar viatja a l’esdeveniment `verificacio:codi`, adreçat a aquell `sid`, i no a la resposta HTTP ni als logs.
- `POST /sessio/verificacio` comprova canal, codi, caducitat (2 minuts), un sol ús i 5 intents. Si tot és correcte, `ResolveSession` llegeix el rol i `session_version` actuals i el router emet el mateix HMAC d’abans (`sub`, `exp`, `ver`). La revocació en sortir (ADR 0014) no canvia.
- Un codi nou al mateix canal invalida l’anterior. Dos canals oberts alhora no es veuen. Tancar el socket invalida els reptes d’aquell canal. Una contrasenya incorrecta continua sent 401 i un correu sense verificar continua sent 403, també sense canal: no s’obre cap repte. Una contrasenya correcta sense connexió viva no obre sessió.
- Repetir un codi al mateix canal abans de 15 segons respon 429 i deixa viu el codi anterior. Hi ha un sostre de 8 codis per canal i 120 per adreça en 10 minuts. Això no és el límit d’intents de contrasenya de l’ADR 0017, que continua proposat i sense implementar.
- L’acceptació d’una invitació continua obrint sessió: l’enllaç ja és un secret d’un sol ús. El coordinador, si entra per `POST /sessio`, passa pel mateix codi.
- L’estat del repte i el registre de connexions viuen a la memòria del procés. Un segon worker no els compartiria. No s’afegeix Redis.

## Conseqüències

- Sense el socket d’aquella finestra no es pot acabar el login, encara que la contrasenya sigui correcta.
- Reiniciar el backend deixa a mitges els logins que no s’han verificat. Les sessions ja emeses no en depenen.
- La CSP no canvia: `connect-src 'self'` ja admet el socket del mateix origen.
- El calendari no passa a Socket.IO.

## Alternatives rebutjades

- Tornar el codi al JSON de `POST /sessio`: qualsevol client HTTP el veuria sense tenir la connexió.
- Confiar en un `sid` enviat pel navegador: es podria redirigir el codi a una altra connexió.
- Web Push, SMS o un autenticador: no són el canal acordat.
- Desar el repte a SQLite: el codi només val mentre el socket és viu i l’Alpha té un sol worker.
- Pujar `session_version` en cada login: invalidaria les altres sessions, i l’ADR 0014 diu que un altre login del mateix usuari segueix sent vàlid.
