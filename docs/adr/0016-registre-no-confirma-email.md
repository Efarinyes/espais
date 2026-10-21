# ADR 0016 — El registre no confirma que l’email existeix

- **Estat:** acceptat
- **Data:** 2026-10-21
- **Relacionat:** [0004](0004-stack-fastapi-vue3-micromamba.md)

## Context

`POST /registre` responia 409 amb «aquest email ja està registrat». Això confirma a qualsevol que el correu té compte. L’inici de sessió, en canvi, respon 401 amb «email o contrasenya incorrectes». [docs/05](../05-registre-alta.md) demanava dir d’iniciar sessió o recuperar l’accés. No hi ha recuperació de contrasenya.

L’email continua sent únic: no es crea un segon compte. La invitació i l’acceptació no formen part d’aquesta decisió.

## Decisió

- Si l’email ja és a la plataforma, `POST /registre` respon 400 amb «No s’ha pogut completar el registre. Revisa les dades o inicia la sessió.»
- El text no diu que el correu estigui registrat ni ofereix una recuperació que no existeix.
- El formulari, si rep un 409 antic, mostra aquesta frase i no la del servidor.
- La contrasenya curta i la resta de validacions continuen amb el seu missatge.

## Conseqüències

- Un client que ja compleix les validacions pot distingir aquest 400 d’un 400 de contrasenya curta pel text. No s’unifiquen: el missatge de longitud ha de continuar sent clar.
- No es canvia el 409 de la invitació ni el de l’acceptació.

## Alternatives rebutjades

- Mantenir el 409 i només suavitzar la frase: el codi i el text seguirien confirmant el correu.
- Respondre 201 sense crear el compte: la persona creuria que l’alta ha funcionat.
