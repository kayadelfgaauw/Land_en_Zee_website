# URL-beleid

De voorkeurs-URL gebruikt `https://landenzee.nl`, zonder `www`.
Een losse HTML-pagina heeft online geen extensie, bijvoorbeeld `/zakelijk` of
`/en/contact`. Een map met `index.html` houdt de afsluitende slash, bijvoorbeeld
`/hotel/` of `/teamuitje-zeeland/`. Canonical, `og:url`, JSON-LD, hreflang en
sitemap gebruiken dezelfde voorkeurs-URL.

De live headers zijn op 28 oktober 2026 gecontroleerd: GitHub Pages serveert de
site en verwijst `www.landenzee.nl` met HTTP 301 naar `landenzee.nl`. Bestaande
pagina's zijn zonder `.html` bereikbaar. De foutieve Engelse canonical
`/en/contact-en-route` gaf HTTP 404; de juiste pagina is `/en/contact`.

## Lokaal bekijken en publiceren

Bronbestanden houden relatieve links naar concrete HTML-bestanden. Daardoor
blijft lokaal bekijken via `file://` werken, ook voor de nieuwe aanbodpagina's.
`scripts/prepare_site.py` zet deze links alleen in de publicatiekopie om naar de
canonieke paden. Queries en fragmenten blijven behouden. Externe boekingslinks
worden niet aangepast.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/prepare_site.py --output dist
```

De uitvoermap moet leeg of nieuw zijn; het script overschrijft geen bestaande
build. De GitHub-workflow voert de controles uit en publiceert vervolgens de
voorbereide kopie in de tijdelijke map van de runner. `.nojekyll` voorkomt een
extra Jekyll-verwerking. Ontwikkelbestanden worden niet meegepubliceerd.

## Vertalingen en sitemap

Alle bestaande vertaalgroepen verwijzen wederzijds naar de eigen canonical van
de Nederlandse, Engelse en Duitse pagina. `x-default` verwijst naar de
Nederlandse variant. De zeven Nederlandse aanbodpagina's hebben geen fictieve
Engelse of Duitse hreflang-varianten. De sitemap bevat uitsluitend de
indexeerbare canonieke pagina's, zonder oude URL's en zonder de 404-pagina.

## Oude URL's

`config/url-redirects.json` is de centrale lijst met oude paden en einddoelen.
De publicatiestap maakt voor elk oud pad zowel een `.html`-doorstuurpagina als
een map met `index.html`. De pagina's bevatten een canonical naar het einddoel,
`noindex`, een directe meta-refresh en een gewone link. JavaScript bewaart ook
queryparameters en het fragment. Voor ontbrekende paden heeft de 404-pagina een
expliciete fallback; onbekende URL's blijven echte 404's.

Na wijziging van de lijst, of na toevoeging van nieuwe pagina's:

```sh
python3 scripts/update_redirects.py
python3 -m unittest discover -s tests -v
```

GitHub Pages voert `.htaccess` **niet** uit. De statische doorstuurpagina's zijn
daarom geen HTTP 301-redirects. De meegeleverde Apache-regels leveren 301's als
de site op Apache met mod_rewrite wordt geserveerd. Voor echte 301's op de
huidige hosting is een redirectfunctie voor de hosting/CDN nodig. Dit project
verandert de hosting en DNS niet.

Nieuwe URL's en redirectgedrag moeten na publicatie nog live gecontroleerd
worden. Lokale tests bewijzen niet dat een nog niet gepubliceerde wijziging al
online actief is.
