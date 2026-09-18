# Glossari

Termes estables. No substituir-los per sinònims al codi, a la UI ni als docs.

| Terme | Significat | No usar |
|---|---|---|
| **Entitat** | Organització que usa l’app (club, AAVV, biblioteca, grup…). Tenant. | organització, tenant (a la UI), associació (excepte si és el nom propi) |
| **Tipologia** | Text lliure que descriu l’activitat de l’entitat. | enum tancat d’esports/arts |
| **Responsable** | Persona amb govern de l’entitat: espais, totes les reserves, anul·lació, anàlisi. | admin, propietari, gestor (a la UI) |
| **Coordinador** | Persona que reserva espais per a una activitat i registra assistència. | monitor, entrenador, professor (són etiquetes de la persona, no el rol) |
| **Espai** | Recurs reservable definit per l’entitat (sala, pista, aula…). | recinte, sala (com a tipus global), resource |
| **Nom local** | Nom de l’espai dins l’entitat. Únic per entitat, no global. | nom canònic, tipus d’espai |
| **Aforament** | Capacitat màxima de l’espai (enter). | capacitat (preferir aforament) |
| **Aforament mínim** | Llindar opcional d’assistents desitjats. Visible a l’anàlisi; no bloqueja la reserva a v1. | quòrum (excepte si es decideix ADR) |
| **Equipament** | Llista opcional de recursos de l’espai (porteries, piano, projector…). | inventari (implica gestió d’estoc) |
| **Disponibilitat** | Finestres horàries en què l’espai es pot reservar. | calendari obert 24/7 per defecte sense documentar |
| **Reserva** | Ocupació d’un espai per un coordinador en un interval. Pot ser per a una activitat interna o oberta al públic. Sense preu. | booking (a la UI), slot, venda |
| **Assistència** | Nombre d’assistents registrat pel coordinador (v1). | llista, check-in, participant |
| **Avís** | Notificació in-app + correu al coordinador quan el responsable anul·la (o reprograma). | alerta, push (v1 no promet push) |
| **Anàlisi** | Vistes d’ús per al responsable (ocupació, reserves, assistència). A la UI: **Estadístiques**. | dashboard BI, informe PDF (v1) |

## Identificadors al codi

Al backend es poden usar noms anglesos de classe (`Entity`, `Space`, `Reservation`) sempre que la UI i els comentaris de negoci usin el glossari català. No barrejar `Organization` i `Entity`.
