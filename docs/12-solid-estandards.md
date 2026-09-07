# SOLID i estàndards

Skill: `architecture-solid`. Aquest document és el contracte anti-deute.

## Responsabilitat única

- Un cas d’ús, una acció de negoci.
- Un repositori, un agregat (Espai, Reserva, Entitat).
- Un component Vue, una raó de canviar (no formularis-monstre).
- Routers FastAPI: adapten HTTP; no calculen solapaments.

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

## Prohibicions

- God modules (`utils.py` calaix de sastre, `helpers.js` global).
- Lògica de negoci a components Vue o a routers.
- Queries sense `entity_id`.
- Còpia de regles (solapament a la UI i al back amb criteris diferents): la UI pot filtrar, el back **valida sempre**.
- Comentaris que expliquen el “què” obvi; sí el “per què” de excepcions.
- TODOs eterns: o es fa, o ADR + backlog al pla.

## Noms

- Casos d’ús: verb + substantiu (`CreateReservation`).
- Taules: plural anglès (`entities`, `spaces`, `reservations`).
- UI: glossari català.

## Quan afegir un ADR

Canvi de stack, de model d’assistència, de canals de notificació, de política multi-tenant, o qualsevol atall conscient de deute.
