# Registre i alta

Skill: `registration-onboarding`. Aquesta és la part de producte més densa. v1 resol un sol camí feliç i deixa la resta com a backlog explícit.

## Objectiu v1

En un sol onboarding:

1. Alta de l’**entitat** (nom + tipologia lliure).
2. Alta del primer **responsable** (nom, email, contrasenya).
3. Entrada a l’app amb empty state guiat: encara no hi ha espais ni coordinadors.
4. La definició d’espais i la invitació de coordinadors **no bloquegen** el registre; es fan després (Fases 3 i 4).

No hi ha enum tancat de tipologies. Exemples: «club de futbol sala», «associació de veïns», «biblioteca», «grup de teatre».

## Flux feliç

```
Formulari unique
  → nom entitat, tipologia
  → nom responsable, email, contrasenya
  → RegisterEntity (atòmic)
  → sessió iniciada com a responsable
  → pantalla d’inici: “Defineix el primer espai” + “Convida coordinadors” (secundari)
```

`RegisterEntity` crea en una transacció: entitat, usuari, membership `responsible`. Si falla un pas, no queda entitat òrfena.

## Validacions

- Email únic a la plataforma (v1: un compte = una persona).
- Nom d’entitat obligatori; unicitat global del nom **no** és invariant (dues AAVV poden dir-se igual a barris diferents). Opcional: avís suau, no bloqueig.
- Contrasenya amb política mínima (longitud); hash al servidor.
- Tipologia opcional però recomanada (empty state millor amb context).

## Empty state post-registre

El responsable no “entra buit” sense guia:

1. CTA principal: crear el primer espai.
2. CTA secundari: convidar coordinadors (pot esperar).
3. Text curt: els espais són vostres; el nom el decideix l’entitat.

## Invitació de coordinadors (després de l’alta)

- El responsable envia invitació per email (enllaç amb token).
- El coordinador accepta, crea compte si no en té, i obté membership `coordinator`.
- v1: un email, una entitat. Si l’email ja existeix a una altra entitat, error clar (backlog: multi-entitat).

## Casuístiques v1 (cal test)

| Cas | Comportament |
|---|---|
| Email ja registrat | Error: iniciar sessió o recuperar accés |
| Doble submit del formulari | Idempotència: no dues entitats |
| Registre a mitges (crash) | Transacció: zero o tot |
| Responsable sense espais | App usable; empty state; no pot haver-hi reserves |

## Backlog (documentat, no v1)

- Transferència de responsable (el actual cedeix el rol).
- Diversos responsables.
- Unió / fusió d’entitats.
- Coordinador o responsable en més d’una entitat.
- Alta d’entitat per un operador de plataforma.
- Verificació d’email obligatòria abans d’usar l’app (v1 pot enviar correu però no bloquejar si no hi ha SMTP al dev).

## Anti-patrons

- Un assistent de 12 passos abans d’entrar.
- Forçar N espais al registre.
- Catàleg predefinit «Sala d’actes / Pista / Aula» com a identitat de l’espai (com a plantilla opcional de UI sí, com a model de dades no).
- God use case que barreja registre, espais i primera reserva.
