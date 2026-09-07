---
name: spaces-definition
description: Defineix espais per entitat (nom local, aforament, equipament, disponibilitat). Use when creating or editing spaces, rooms, capacity, equipment, availability windows, or unique space names.
---

# Spaces definition — Espais

## Idea força

L’espai pertany a l’entitat. “Sala 1” d’A i “Sala 1” de B són files diferents. Unique `(entity_id, lower(name))` només.

## Checklist

- [ ] CRUD acotat a `entity_id`
- [ ] Nom, aforament > 0, equipament opcional, finestres de disponibilitat
- [ ] Desactivar ≠ esborrar historial; impedeix reserves noves
- [ ] Cap `space_type_id` global com a identitat
- [ ] Plantilles de UI només com a placeholder
- [ ] Empty state per al responsable
- [ ] Tests: duplicate dins entitat falla; duplicate entre entitats ok

## Recursos

- [docs/06-espais.md](../../../docs/06-espais.md)
- [docs/adr/0002-espais-definits-per-entitat.md](../../../docs/adr/0002-espais-definits-per-entitat.md)
