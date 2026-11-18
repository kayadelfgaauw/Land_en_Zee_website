# Afbeeldingen optimaliseren

## Aanpassing van 18 november 2026

De lokale rasterafbeeldingen op 77 pagina's gebruiken nu WebP-varianten met
`srcset` en een `sizes`-beschrijving die past bij de toepassing. Dit betreft
2.242 afbeeldingselementen uit 191 oorspronkelijke bestanden. De 744 varianten
staan in `images/responsive/`; de bronbestanden blijven behouden.

Foto's hebben breedtes van maximaal 480, 960, 1440 en 1900 pixels, begrensd door
de oorspronkelijke resolutie. Het logo heeft kleinere, verliesvrij opgeslagen
varianten met transparantie. Deze transcodering wijzigt geen uitsnede of inhoud.
Bij de grootste WebP-variant blijven de oorspronkelijke bytes behouden als
hercoderen een groter bestand zou opleveren.

Headerlogo's en belangrijke openingsbeelden laden direct. Overige beelden,
waaronder menu- en galerijfoto's, gebruiken `loading="lazy"`. Afmetingen worden
gereserveerd met `width` en `height`. De twee fotoachtergronden in het gedeelde
stylesheet gebruiken eveneens varianten, inclusief een keuze voor mobiele
schermen met verschillende pixeldichtheden.

## Voorbeelden van bestandsgrootte

| Afbeelding | Oorspronkelijk | Voorbeeldvariant | Reductie |
| --- | ---: | ---: | ---: |
| Gedeeld logo | 785.771 bytes | 320 px: 21.040 bytes | 97,3% |
| Vergaderfoto 149 | 206.044 bytes | 960 px: 68.422 bytes | 66,8% |
| Creatieve activiteit | 395.934 bytes | 960 px: 102.622 bytes | 74,1% |

Dit zijn bestandsvergelijkingen. Welke variant een browser kiest hangt onder
andere af van schermbreedte, pixeldichtheid en de plaats van het beeld. Dit is
geen gemeten verbetering van de laadtijd of Lighthouse-score.

## Onderhoud en publicatie

Genereer na nieuwe of vervangen afbeeldingen opnieuw de varianten. Het script
vereist Pillow; de publicatiestap heeft deze bibliotheek niet nodig.

```sh
python3 scripts/optimize_images.py
python3 -m unittest discover -s tests
node --test tests/test_business_options.cjs
```

`data-image-original` bewaart de oorspronkelijke lokale bronverwijzing. Het
script kan daardoor opnieuw worden uitgevoerd zonder afgeleide bestanden
opnieuw te verkleinen. Bestandsnamen bevatten een hash van de bron: bij een
nieuwe versie ontstaat een nieuwe URL. Het manifest in
`config/image-variants.json` beschrijft de gegenereerde bestanden.

Publiceer de gewijzigde HTML, CSS én `images/responsive/` samen. De bestaande
build neemt deze bestanden mee en maakt `srcset`-paden op de 404-pagina absoluut,
zodat afbeeldingen ook onder een onbekende, geneste URL bereikbaar blijven.

## Verificatie en vervolgstap

- 21 Python-projecttests en 6 controles voor het zakelijke formulier slagen.
- Alle 744 varianten zijn geopend en op afmetingen gecontroleerd. De bronhashes
  bevestigen dat de oorspronkelijke bestanden ongewijzigd zijn.
- Het logo en twee representatieve foto's zijn visueel vergeleken.
- Dit is geen browsermeting van netwerkverkeer of Core Web Vitals.

De aangeleverde Lighthouse-meting van 18 november, 10:03 CET, vermeldt 44 voor
prestaties, FCP 8,1 s, LCP 26,5 s, TBT 490 ms, CLS 0,004 en een totale payload
van 23.699 KiB, met een geëmuleerd Moto G Power-apparaat en langzame 4G.
Die meting toont nog de oorspronkelijke afbeeldings-URL's; deze nieuwe
bestanden zijn nog niet gepubliceerd of via Lighthouse doorgemeten.

Na publicatie dezelfde URL onder vergelijkbare omstandigheden opnieuw meten.
De cachetermijn van tien minuten uit het rapport vraagt afstemming met de
hosting/CDN. Deze wijziging past cacheheaders niet aan. Voor verdere verbetering
van FCP en LCP het concrete LCP-element, renderblokkerende bestanden en externe
scripts onderzoeken aan de hand van de volledige Lighthouse-trace.

Referenties:

- https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
- https://web.dev/articles/browser-level-image-lazy-loading
