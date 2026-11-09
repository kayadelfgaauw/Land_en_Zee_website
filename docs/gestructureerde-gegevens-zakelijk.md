# Gestructureerde gegevens voor zakelijk

De zakelijke hoofdpagina en de zeven aanbodpagina's bevatten statische JSON-LD
in de HTML. Er is geen JavaScript-uitvoering nodig om deze gegevens te lezen.

## Entiteiten en relaties

- `https://landenzee.nl/#resort`: Resort Land & Zee, type `Resort`.
- `https://landenzee.nl/hotel/#hotel`: het hotel, type `Hotel`.
- `https://landenzee.nl/#restaurant`: Restaurant Zeeuws Verlangen, type `Restaurant`,
  met als website `https://www.zeeuwsverlangen.nl/`.
- `https://landenzee.nl/zakelijk#aanbod`: een `OfferCatalog` met zeven aanbiedingen.
- Iedere aanbodpagina heeft een eigen `Service` met `#service` als identificatie.

De hoofdpagina (`CollectionPage`) verwijst met `mainEntity` naar de catalogus.
Iedere catalogusaanbieding (`Offer`) verwijst via `itemOffered` naar de betreffende
dienst. De detailpagina (`WebPage`) heeft die dienst als `mainEntity`; de dienst
verwijst terug met `mainEntityOfPage` en noemt het resort als `provider`.
De bestaande broodkruimels blijven behouden.

Hotel en restaurant zijn als locaties op het resort beschreven via
`containedInPlace`. Dit zegt niets over juridische eigendom. De zakelijke
pagina's noemen ze via `mentions`, in aansluiting op de zichtbare informatie
over verblijf en eten. Dit introduceert geen zichtbare links tussen aanbodpagina's.

De bestaande Nederlandse, Engelse en Duitse homepage- en hotelgegevens gebruiken
dezelfde resort- en hotelidentificaties. Hun vertaalde teksten blijven behouden.
De beschadigde afbeeldings-URL in de Nederlandse hotelgegevens is hersteld.

## Inhoud onderhouden

Dienstbeschrijvingen komen uit de zichtbare introductie van de aanbodpagina.
Paginabeschrijvingen komen uit de bestaande meta-description. Na tekstwijzigingen:

```sh
python3 scripts/update_business_schema.py
python3 -m unittest discover -s tests -v
```

Er zijn geen nieuwe prijzen, beschikbaarheidsclaims, reviews, sterren of exacte
zaalcapaciteiten toegevoegd. Prijsloze `Offer`-objecten beschrijven hier het
aanbod; dit is geen productfeed en belooft geen Google-productresultaat.
Bestaande hotel- en resortkenmerken buiten de zakelijke gegevens vallen buiten
deze uitbreiding.

## Controle en publicatie

De projecttests controleren geldige JSON, de dienst per pagina, catalogusdekking,
entiteitsverwijzingen, broodkruimels, bestaande afbeeldingsbestanden en behoud
van de gegevens in de publicatiekopie. Dit is geen externe validatorrapportage.

Na publicatie de live URL's controleren met de Schema.org-validator en de Google
Rich Results Test. De Rich Results Test controleert alleen door Google
ondersteunde zoekfuncties; een `Service` of `OfferCatalog` hoeft daar niet als
zoekfunctie te verschijnen. Geldige markup garandeert geen uitgebreid
zoekresultaat of hogere positie.

Bronnen:

- https://schema.org/Service
- https://schema.org/OfferCatalog
- https://schema.org/containedInPlace
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
