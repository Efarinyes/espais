---
name: architecture-solid
description: Revisa capes, SRP i deute tècnic del projecte Espais. Use before closing a phase, after adding a use case, or when the user asks for an architecture or SOLID review.
---

# Architecture and SOLID — Espais

SOLID és un criteri de revisió. No és un motiu per refactoritzar ni per inventar capes. Abans de proposar un canvi d’estructura, llegeix l’ADR vigent del tema. Si el contradiria, no el facis: proposa l’esmena i deixa-la pendent. Un ADR esmenat, substituït o obsolet no és la decisió vigent.

## Preguntes

- Aquesta responsabilitat té una raó de canvi independent? El nombre de línies no hi respon.
- El router o el component Vue calcula negoci?
- Hi ha query sense `entity_id`?
- L’assistència o el mail van per un port?
- S’ha creat un `*Service`, composable o capa només per escurçar un fitxer?

## Classifica abans de corregir

1. Violació real de responsabilitat.
2. Duplicació real.
3. Deute arquitectònic conscient documentat en un ADR. El que no ho estigui, s’hi documenta; no es refactoritza sol.
4. Deute d’implementació: sense ADR, al seguiment del projecte.
5. Millora opcional o preferència teva.

Els punts 3, 4 i 5 no són errors a corregir sols. El criteri i els exemples són a [docs/12-solid-estandards.md](../../../docs/12-solid-estandards.md).

Una refactorització demanada, o una violació real dins l’abast, ha de tenir raó concreta, problema identificat, impacte controlat, el mateix comportament, tests que es mantenen o milloren, i respecte dels ADR.

Una inconsistència de producte o de domini no decidida: informa on és i quina decisió falta. No canviïs el model. Vegeu [docs/15-protocol-sessio.md](../../../docs/15-protocol-sessio.md).

## Checklist

- [ ] Un cas d’ús = una acció
- [ ] Ports i adaptadors, no detalls d’infra al domini
- [ ] Front: vistes primes; cap extracte només per línies
- [ ] Cap ADR vigent contradit
- [ ] Sense `.venv`, sense Vue global
- [ ] Noms de casos d’ús estables (`CreateReservation`, …)

## Recursos

- [docs/10-arquitectura.md](../../../docs/10-arquitectura.md)
- [docs/12-solid-estandards.md](../../../docs/12-solid-estandards.md)
