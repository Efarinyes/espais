# Paletes aprovades — Espais

Paletes aprovades i implementades. El nom visible de la primera família és **Vinyes vora al mar**. Els identificadors segueixen sent `vinyes` i `vinyes-dark`. Mar i cel queda amb els hex aprovats, sense cap canvi posterior.

Els hex d’aquest document són els de l’aplicació. La previsualització és [`proposta-paletes.html`](proposta-paletes.html): el mateix contingut a les quatre famílies i als dos modes, sense dependències.

Els contrastos s’han calculat amb la luminància relativa de WCAG 2.2, la mateixa fórmula que `frontend/src/aparenca/contrast.ts`. Text normal: 4,5:1. Vora, focus i límit d’un control: 3:1. Cap parell d’aquesta proposta que porti text o que faci de límit queda per sota.

## 1. Què hi ha a l’exportació de Khroma

Fitxer: `docs/ux/colors/research/my_khroma_data.json`. Està fora de Git. El fitxer té aquestes claus:

| Clau | Valor real |
|---|---|
| `selectedColors` | 50 colors, cadascun un RGB de tres enters |
| `favorites` | llista buida |
| `customImage` | `false` |
| `theme` | `light` |
| `wcagLimit` | `false` |
| `chromatic` | `true` |
| `biases` | `a` = 0,5 i `b` = 0,5 |
| `network` | xarxa exportada |

No hi ha paletes generades ni combinacions desades. El fitxer no explica què controlen `biases.a` i `biases.b`.

La xarxa és un perceptró: 3 entrades, 15 neurones logístiques, 5 neurones logístiques i 1 sortida logística. 125 connexions, cap amb porta. L’entrada és R, G i B entre 0 i 1. La sortida és una puntuació de 0 a 1. S’ha executat aquest pas endavant amb els pesos del fitxer. La sortida desada de la xarxa (0,0246) coincideix amb el càlcul sobre el color que tenia carregat, RGB 190, 244, 184. No s’ha reentrenat res.

La puntuació mitjana dels 50 colors triats és 0,74. El mínim és 0,26 (`#9DA0B1`) i el màxim és 1,00. Vint-i-nou colors queden a 0,80 o més. Els que queden al voltant de 0,35–0,45 són, sobretot, blaus, cian i taronges vius. El model no dóna per bones totes les tries: generalitza cap a verds tendres, ors, ocres, pedra càlida i alguns violetes, i es queda fred amb el blau saturat i el taronja pur.

Els fons molt clars puntuen alt gairebé en qualsevol matís. Els fons molt foscos puntuen prop de 0, llevat d’alguns terres concrets de la llista (`#6A4E28`, `#883725`, `#8A1018`, `#A36700`).

Els 50 colors, en l’ordre del fitxer, i la puntuació del model:

`#DB715C` 0,34 · `#883725` 0,81 · `#2AB343` 0,43 · `#D2F8DE` 1,00 · `#905444` 0,43 · `#2298BF` 0,44 · `#AFEFFC` 0,53 · `#69B083` 1,00 · `#859F69` 1,00 · `#6392C4` 0,44 · `#F5F7A4` 1,00 · `#3F3D5B` 0,35 · `#ABD594` 1,00 · `#D0C1BB` 1,00 · `#E2E0DA` 0,99 · `#A4EC8C` 1,00 · `#FAF778` 1,00 · `#CE4E18` 0,44 · `#218901` 1,00 · `#A8FE99` 1,00 · `#C99A95` 0,45 · `#61ED99` 1,00 · `#E25B2A` 0,43 · `#7C5DD7` 1,00 · `#77B655` 0,83 · `#DDDFE9` 0,89 · `#143164` 0,44 · `#B6E6D6` 0,97 · `#EC925E` 1,00 · `#E6CDCA` 1,00 · `#1F54A3` 0,41 · `#81879D` 0,42 · `#434867` 0,41 · `#D096CA` 1,00 · `#A36700` 1,00 · `#E5AF52` 0,80 · `#E37384` 0,44 · `#F75A3A` 0,42 · `#9C7FCA` 1,00 · `#6A4E28` 1,00 · `#FAA8B3` 0,45 · `#CBA98C` 1,00 · `#5B767E` 0,38 · `#7F09D4` 1,00 · `#C5953B` 0,98 · `#E5E3DC` 0,98 · `#D14512` 0,44 · `#3E5DB2` 0,42 · `#8A1018` 0,98 · `#9DA0B1` 0,26.

## 2. Com s’han fet servir les preferències

El model puntua un color sol. No sap què és un botó, un error o un fons fosc. S’ha fet servir com a brúixola, i els 50 colors com a tries explícites quan el model i la llista no diuen el mateix.

- Els fons clars són pedra càlida, propers a `#E2E0DA`, `#E5E3DC`, `#E6CDCA` i `#D0C1BB`, que el model puntua al voltant d’1. Mar i cel és l’excepció: el fons és fred, perquè la família és el mar.
- Vinyes no porta el violeta `#7C5DD7` com a botó. El model el puntua a 1,00, però un violeta dominant no descriu el paisatge. El clar lidera amb el verd de vinya `#2F6B58` i el mar `#2F7480`. La pedra `#C9BBA6` és l’accent. La terracota `#9A4E3A` només és el color dels títols.
- Camps clar es manté: or `#D4AE3A`, argila `#8E5A38` i palla `#E6D3A4`. El fosc es replanteja en els mateixos papers, sense el verd que cansava.
- El verd de la llista (`#77B655`, `#859F69`, `#A4EC8C`) es reserva per a la fulla de Cítrics, que és el contrapunt d’aquella família, i per a l’èxit, que és comú.
- El taronja viu de la llista (`#F75A3A`, `#E25B2A`, `#D14512`) puntua al voltant de 0,43 i no aguanta text blanc. Cítrics clar conserva l’albercoc `#C25116` i hi afegeix la llimona `#F0D030` i la fulla `#9AD040`. De nit la fruita és `#F0A030`, el groc `#D6E85A` i la fulla `#8FCB55`, sobre un fons fosc que no és marró.
- Els blaus de la llista (`#1F54A3`, `#143164`, `#2298BF`, `#6392C4`, `#3E5DB2`) puntuen al voltant de 0,41–0,44. Mar i cel els conserva, perquè són una tria explícita. El primari `#1B4F86` és el veí que aguanta el text. L’accent clar `#5B767E` és un color de la llista.
- L’èxit, l’avís, l’error i la informació no surten del model. El model no codifica significat. Són comuns a les quatre famílies.
- El maó de Vinyes i el vermell d’error no són el mateix hex. L’error és un escarlata de senyal. La terracota és més rosada i més clara.

Els tres punts de «Tria els colors» serien el primari, el secundari i l’accent del mode clar. Identifiquen la família. El mode fosc aplica la nit de cada taula, que no és el clar aclarit.

## 3. Papers comuns

| Paper | Funció |
|---|---|
| `background` | Fons de pàgina. Avui, `base-200`. |
| `surface` | Targeta, capçal, calaix. Avui, `base-100`. |
| `surface-raised` | Menú flotant i diàleg, un pas per sobre de la targeta. |
| `text` / `text-muted` | Text principal i secundari. El secundari és un color sòlid, no una opacitat. |
| `heading` | Títols. També és el color del focus. |
| `border` | Vora de camp i de targeta. |
| `focus` | Anell del camp i de la franja triada. |
| `primary` / `on-primary` | Botó principal i el text que hi va a sobre. |
| `primary-border` | Contorn del botó principal. |
| `accent-border` | Contorn del xip. Només a Camps clar és un color diferent del farcit. |
| `secondary` / `on-secondary` | Segon botó i barra de gràfic. |
| `accent` / `on-accent` | Tercer color: xip i indicador. |
| `selected` / `on-selected` | Fons i text de l’element triat. |

Èxit, avís i informació usen el mateix hex com a text, com a vora de l’avís i com a farcit d’un botó sòlid. `on-*` és el text d’aquest botó. `*-soft` és el fons de l’avís.

L’error en té dos, perquè un sol vermell no pot ser alhora text fosc sobre crema i botó visible sobre la nit:

| | Text i vora de l’avís | Farcit del botó | Text del botó | Fons de l’avís |
|---|---|---|---|---|
| Clar | `#8E1D2A` | `#C4272E` | `#FFFFFF` | `#F3CDD2` |
| Fosc | `#FFB4BA` | `#E07A86` | `#2A1216` | `#6A3840` |

La resta de semàntics:

| | Clar | Fosc |
|---|---|---|
| Èxit, text i farcit | `#146B38` | `#7DCE9A` |
| Èxit, text del farcit | `#FFFFFF` | `#062214` |
| Èxit, fons d’avís | `#C3E0CC` | `#1E5238` |
| Avís, text i farcit | `#7A4E00` | `#F2C56A` |
| Avís, text del farcit | `#FFFFFF` | `#2A1C04` |
| Avís, fons d’avís | `#EED7A4` | `#62481E` |
| Informació, text i farcit | `#1E4E78` | `#A9D2F2` |
| Informació, text del farcit | `#FFFFFF` | `#062033` |
| Informació, fons d’avís | `#C9DCF0` | `#20445C` |

A Mar i cel, el blau d’informació `#1E4E78` i el primari `#1B4F86` són parents. L’avís es distingeix pel panell suau i per la frase, no per un segon blau inventat. El botó principal continua sent el bloc sòlid.

La nit de cada família conserva la seva identitat. Vinyes és verd i mar. Cítrics és fruita lluminosa. Camps és blat i terra. Mar i cel, ja aprovada, és la nit marina. Els fons no són negres purs i les superfícies pugen en tres graons.

## 4. Vinyes vora al mar

Verd de vinya, mar blauverdós i pedra clara. La terracota `#9A4E3A` només pinta els títols i el focus, perquè els vermellosos no dominin la pantalla. No s’hi ha posat verd d’olivera a part: el verd de vinya ja és el color que lidera, i la fulla lluminosa queda per a Cítrics.

La pedra `#C9BBA6` contra la pàgina fa 1,67:1. El xip porta la vora `#6E6256`, a 5,24:1 del fons. El text sobre la pedra fa 7,88:1.

### Clar

| Token | Hex |
|---|---|
| background | `#F3F1EA` |
| surface | `#F8F6F1` |
| surface-raised | `#FDFCFA` |
| text | `#1E2A26` |
| text-muted | `#54605A` |
| heading / focus | `#9A4E3A` |
| border | `#7E8A82` |
| primary / on-primary | `#2F6B58` / `#FFFFFF` |
| secondary / on-secondary | `#2F7480` / `#FFFFFF` |
| accent / on-accent | `#C9BBA6` / `#1E2A26` |
| accent-border | `#6E6256` |
| selected / on-selected | `#DCE8E2` / `#9A4E3A` |

### Fosc

La nit és de vinya i de mar, no de terra marró. El fons `#142822` és un verd profund. El botó és el verd `#4EAE8C` i el segon color és el mar `#7EB8C8`. La pedra queda clara. La terracota dels títols, `#E4C2B4`, és només un contrapunt.

| Token | Hex |
|---|---|
| background | `#142822` |
| surface | `#1C342C` |
| surface-raised | `#244038` |
| text | `#E7F3EC` |
| text-muted | `#B7CDC2` |
| heading / focus | `#E4C2B4` |
| border | `#6E9A8C` |
| primary / on-primary | `#4EAE8C` / `#0E2418` |
| secondary / on-secondary | `#7EB8C8` / `#0E242C` |
| accent / on-accent | `#E6DDD2` / `#241C16` |
| selected / on-selected | `#1E4A40` / `#E7F3EC` |

## 5. Cítrics i sol

Llimona, albercoc i fulla de cítric. El clar deixa els ocres marrons: el fons és groc de llimona, l’accent és `#F0D030` i la fulla `#9AD040` és verda clara. L’albercoc `#C25116` es conserva. La nit no és marró: el fons és fosc i quiet, i la fruita, el groc i la fulla hi fan de llum.

La llimona contra la pàgina fa 1,41:1 i la fulla 1,69:1. El xip de llimona porta la vora `#A34808`. El botó de fulla porta la vora `#3F7A14`, a 4,84:1 del fons. El text `#1E2408` sobre la fulla fa 8,75:1.

### Clar

| Token | Hex |
|---|---|
| background | `#FFF6D4` |
| surface | `#FFFBE8` |
| surface-raised | `#FFFEF6` |
| text | `#2A240E` |
| text-muted | `#5C5428` |
| heading / focus | `#A34808` |
| border | `#7A6230` |
| primary / primary-border | `#C25116` / `#A34808` |
| on-primary | `#FFFFFF` |
| secondary / on-secondary | `#9AD040` / `#1E2408` |
| secondary-border | `#3F7A14` |
| accent / on-accent | `#F0D030` / `#2A240E` |
| accent-border | `#A34808` |
| selected / on-selected | `#FFE08A` / `#A34808` |

### Fosc

| Token | Hex |
|---|---|
| background | `#1C2420` |
| surface | `#24302A` |
| surface-raised | `#2C3A32` |
| text | `#F7F6EE` |
| text-muted | `#D5D2C0` |
| heading / focus | `#F6E27A` |
| border | `#B0A080` |
| primary / on-primary | `#F0A030` / `#2A1808` |
| secondary / on-secondary | `#D6E85A` / `#1E2208` |
| accent / on-accent | `#8FCB55` / `#14200C` |
| selected / on-selected | `#2A3828` / `#F7F6EE` |

## 6. Camps i cereals

Blat madur a punt de sega. Els dominants són daurats i palla. El segon pla és argila i terra torrada. No hi ha verd de marca.

L’or `#D4AE3A` contra la pàgina fa 1,87:1. El botó porta la vora `#7A5418`, a 5,97:1 del fons i a 3,19:1 de l’or. El text `#2A2416` sobre l’or fa 7,28:1. La palla `#E6D3A4` fa 1,31:1 amb la pàgina i el xip usa la mateixa vora. L’argila `#8E5A38` amb text blanc fa 5,72:1 i se separa sola del fons, a 5,06:1.

### Clar

| Token | Hex |
|---|---|
| background | `#F7F1DC` |
| surface | `#FBF6E8` |
| surface-raised | `#FFFCF3` |
| text | `#2A2416` |
| text-muted | `#5C5344` |
| heading / focus | `#6A5018` |
| border | `#8A7A58` |
| primary / primary-border | `#D4AE3A` / `#7A5418` |
| on-primary | `#2A2416` |
| secondary / on-secondary | `#8E5A38` / `#FFFFFF` |
| accent / on-accent | `#E6D3A4` / `#2A2416` |
| accent-border | `#7A5418` |
| selected / on-selected | `#F3E4B8` / `#6A5018` |

### Fosc

El clar es manté. La nit es replanteja perquè la versió groguenca sobre un fons fosc produïa una dominant verda que cansava la vista. Ara el fons és terra torrada, el llum és blat `#E8C056` i el segon color és ocre `#D4924E`. No hi ha verd.

| Token | Hex |
|---|---|
| background | `#2C241C` |
| surface | `#362C22` |
| surface-raised | `#403428` |
| text | `#F7F1E6` |
| text-muted | `#E0D0B8` |
| heading / focus | `#F0D7A0` |
| border | `#C4A888` |
| primary / on-primary | `#E8C056` / `#2A1C08` |
| secondary / on-secondary | `#D4924E` / `#2A160C` |
| accent / on-accent | `#F0E0C4` / `#2A2014` |
| selected / on-selected | `#4A3C2C` / `#F7F1E6` |

## 7. Mar i cel

Marí, cel i pissarra. El clar es conserva. La nit es manté marina, però més clara que un negre: el cel `#7EBFDE` il·lumina i l’escuma `#C5D5E0` queda en un segon pla més gris.

### Clar

| Token | Hex |
|---|---|
| background | `#F3F6F6` |
| surface | `#F8FBFB` |
| surface-raised | `#FFFFFF` |
| text | `#1A2428` |
| text-muted | `#4C5C64` |
| heading / focus | `#143E68` |
| border | `#6A7C84` |
| primary / primary-border | `#1B4F86` / `#143E68` |
| on-primary | `#F5F9FF` |
| secondary / on-secondary | `#2478A8` / `#FFFFFF` |
| accent / on-accent | `#5B767E` / `#FFFFFF` |
| selected / on-selected | `#E3EEF4` / `#143E68` |

### Fosc

| Token | Hex |
|---|---|
| background | `#1C2A34` |
| surface | `#243440` |
| surface-raised | `#2C3E4C` |
| text | `#E8F1F5` |
| text-muted | `#B4C6D2` |
| heading / focus | `#D7E8F4` |
| border | `#8AA4B4` |
| primary / on-primary | `#7EBFDE` / `#0E2430` |
| secondary / on-secondary | `#C5D5E0` / `#12202A` |
| accent / on-accent | `#D5E2EA` / `#12202A` |
| selected / on-selected | `#34566A` / `#E8F1F5` |

`#1B4F86` puntua 0,43, en la franja dels blaus triats. `#5B767E` puntua 0,38. El mar de Vinyes, `#2F7480`, és més verd i més quiet que aquest cel, perquè les dues famílies no comparteixin el mateix blau de botó.

## 8. Comparació

| | Vinyes | Cítrics | Camps | Mar i cel |
|---|---|---|---|---|
| Primari clar | `#2F6B58` vinya | `#C25116` albercoc | `#D4AE3A` blat | `#1B4F86` marí |
| Secundari clar | `#2F7480` mar | `#9AD040` llimona verda | `#8E5A38` argila | `#2478A8` cel |
| Accent clar | `#C9BBA6` pedra | `#F0D030` llimona | `#E6D3A4` palla | `#5B767E` pissarra |
| Fons clar | `#F3F1EA` | `#FFF6D4` | `#F7F1DC` | `#F3F6F6` |
| Primari fosc | `#4EAE8C` | `#F0A030` | `#E8C056` | `#7EBFDE` |
| Fons fosc | `#142822` vinya | `#1C2420` nit quieta | `#2C241C` terra | `#1C2A34` mar |

De dia, Cítrics és llimona, albercoc i fulla. Camps és blat i argila, sense verd. Vinyes és vinya, mar i pedra. Mar i cel, aprovada, és l’únic blau que lidera.

## 9. Contrastos

Mínim de cada paper sobre fons, targeta i superfície alta. El botó és el text sobre el farcit. El contorn és el mínim de la vora del botó contra els tres fons.

| Paper | Vinyes clar | Vinyes fosc | Cítrics clar | Cítrics fosc | Camps clar | Camps fosc | Mar clar | Mar fosc |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Text | 13,14 | 9,88 | 14,28 | 11,02 | 13,63 | 10,74 | 14,56 | 9,65 |
| Text secundari | 5,81 | 6,71 | 7,04 | 7,85 | 6,69 | 7,98 | 6,39 | 6,29 |
| Títol i focus | 5,27 | 6,79 | 5,56 | 9,14 | 6,70 | 8,58 | 10,07 | 8,81 |
| Vora | 3,18 | 3,57 | 5,36 | 4,66 | 3,71 | 5,35 | 4,00 | 4,24 |
| Primari, text | 6,24 | 6,04 | 4,68 | 7,93 | 7,28 | 9,55 | 7,92 | 7,91 |
| Primari, contorn | 5,52 | 4,16 | 5,56 | 5,56 | 5,97 | 6,96 | 10,07 | 5,47 |
| Secundari, text | 5,34 | 7,33 | 8,75 | 12,08 | 5,72 | 6,58 | 4,85 | 11,04 |
| Accent, text | 7,88 | 12,48 | 10,15 | 8,73 | 10,44 | 12,29 | 4,84 | 12,56 |
| Selecció | 4,73 | 8,74 | 4,67 | 11,43 | 5,99 | 9,46 | 9,28 | 6,83 |

Semàntics, el mínim entre les quatre famílies:

| Parell | Clar | Fosc |
|---|---:|---:|
| Èxit, text sobre la pàgina | 5,82 | 5,88 |
| Èxit, text sobre el fons de l’avís | 4,66 | 4,82 |
| Èxit, blanc o tinta sobre el farcit | 6,58 | 8,96 |
| Avís, text sobre la pàgina | 6,37 | 6,82 |
| Avís, text sobre el fons de l’avís | 5,10 | 5,26 |
| Avís, blanc o tinta sobre el farcit | 7,20 | 10,24 |
| Error, text sobre la pàgina | 7,87 | 6,57 |
| Error, text sobre el fons de l’avís | 6,13 | 5,54 |
| Error, text sobre el botó | 5,71 | 6,10 |
| Informació, text sobre la pàgina | 7,69 | 6,94 |
| Informació, text sobre el fons de l’avís | 6,20 | 6,46 |
| Informació, blanc o tinta sobre el farcit | 8,69 | 10,45 |

El pas més estret és 4,66:1, el verd `#146B38` sobre `#C3E0CC`. El botó més estret és l’albercoc de dia, 4,68:1. La vora més estreta és la de Vinyes clar, 3,18:1.

L’or de Camps contra la pàgina fa 1,87:1 i el botó porta la vora `#7A5418`. La llimona de Cítrics fa 1,41:1 i la fulla 1,69:1; totes dues porten vora. La pedra de Vinyes fa 1,67:1 i el xip porta la vora `#6E6256`.

Els avisos se separen de la pàgina pel fons i per la vora. El text de l’avís sobre el seu fons queda per sobre de 4,5:1. Els colors semàntics no s’han canviat, perquè són comuns i Mar i cel ja els té aprovats.

## 10. Justificació

Mar i cel queda tancada, en clar i en fosc.

Vinyes deixa de ser una pantalla de vermells. El botó és verd de vinya, el segon és mar blauverdós i l’accent és pedra. La terracota només és als títols. La nit és verda i de mar, no un fons marró amb taronges.

Cítrics deixa els ocres marrons de dia: fons de llimona, albercoc conservat, fulla verda clara i llimona. La nit deixa el marró. El fons és fosc i quiet, i els llums són taronja, groc i fulla.

Camps clar no es toca. El fosc abandona la barreja groguenca que virava a verd. El fons és terra, el llum és blat i el segon color és ocre. No hi ha verd.

## 11. Estat

Les quatre famílies estan aprovades i implementades als vuit temes de `frontend/src/styles.css`. El nom visible és «Vinyes vora al mar». Els hex d’aquest document no es tornen a interpretar.
