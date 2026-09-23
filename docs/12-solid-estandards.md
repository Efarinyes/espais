# SOLID i estàndards

Skill: `architecture-solid`. Criteri de disseny i de revisió. No és una ordre de refactoritzar el que ja funciona.

## Responsabilitat única

La pregunta és: **aquesta responsabilitat té una raó de canvi independent?** El nombre de línies d’un fitxer no basta per declarar una violació ni per partir el mòdul.

- Un cas d’ús, una acció de negoci.
- Un repositori, un agregat (Espai, Reserva, Entitat).
- Un component Vue, una raó de canviar (no formularis-monstre).
- Routers FastAPI: adapten HTTP; no calculen solapaments.
- No creïs composables, serveis, classes o capes només per escurçar un fitxer.

## Obert/tancat

- Assistència: port `AttendanceStrategy`; v1 només `CountAttendance`.
- Notificació: port `Notifier`.
- No `if strategy == "named_list"` escampats per l’API.

## Substitució i interfícies

- Ports al paquet `ports/`; adaptadors a `adapters/`.
- Tests unitaris del cas d’ús amb fakes, no amb SQLite, tret dels tests d’adaptador.

## Segregació

- No `EntityService` amb registre + espais + reserves + mail.
- El coordinador no depèn d’interfícies d’anàlisi.

## Inversió de dependències

- Els casos d’ús depenen de ports. FastAPI injecta adaptadors.
- Vue: views depenen de composables; composables de serveis injectats.

## Què és deute i què no

| Situació | Què fer |
|---|---|
| Violació real de responsabilitat (negoci al router, query sense `entity_id`, regla d’ADR incomplerta) dins l’abast | Corregir-la, sense redissenyar el voltant |
| Duplicació real de la mateixa regla | Unificar-la, en proporció |
| Deute arquitectònic conscient, ja en un ADR | Deixar-lo. No és una refactorització automàtica |
| Deute d’implementació (refactor petit, millora visual, optimització, neteja, test menor, duplicació coneguda, tasca sense decisió d’arquitectura) | Sense ADR. Al seguiment del projecte. No és una violació a corregir sola |
| Millora opcional o preferència de l’agent | No fer-la |

El deute arquitectònic conscient —el que afecta l’arquitectura, el disseny estructural o l’evolució— ha d’estar en un ADR. El d’implementació, no.

## Refactorització

Només si la tasca la demana, o per corregir una violació real dins l’abast. Cal una raó concreta, un problema identificat, impacte controlat, el mateix comportament, tests que es mantenen o milloren, i respecte dels ADR vigents. Sense arquitectura nova.

## Prohibicions

- God modules (`utils.py` calaix de sastre, `helpers.js` global).
- Lògica de negoci a components Vue o a routers.
- Queries sense `entity_id`.
- Còpia de regles (solapament a la UI i al back amb criteris diferents): la UI pot filtrar, el back **valida sempre**.
- Comentaris que expliquen el “què” obvi; sí el “per què” de excepcions.
- Partir un mòdul pel nombre de línies.
- Un `TODO` al codi no és un pla. Un atall arquitectònic nou va a un ADR; un d’implementació, al seguiment. No obris la refactorització pel teu compte.

## Noms

- Casos d’ús: verb + substantiu (`CreateReservation`).
- Taules: plural anglès (`entities`, `spaces`, `reservations`).
- UI: glossari català.

## Quan afegir un ADR

Canvi de stack, de model d’assistència, de canals de notificació, de política multi-tenant, o deute arquitectònic conscient. El deute d’implementació no porta ADR. Documentar un deute no el converteix en feina a fer.
