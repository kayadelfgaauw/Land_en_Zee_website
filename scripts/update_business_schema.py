"""Refresh static business JSON-LD from the visible page content."""
from copy import deepcopy
from html import unescape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://landenzee.nl'
RESORT = ORIGIN + '/#resort'
HOTEL = ORIGIN + '/hotel/#hotel'
RESTAURANT = ORIGIN + '/#restaurant'
HUB = ORIGIN + '/zakelijk'
CATALOG = HUB + '#aanbod'
SCHEMA = re.compile(r'(<script type="application/ld\+json">).*?(</script>)', re.S)
OFFERS = [
    ('vergaderen-zeeland', 'Vergaderen'),
    ('heisessie-zeeland', 'Heisessies & MT-overleg'),
    ('teamuitje-zeeland', 'Teamuitjes & teambuilding'),
    ('vergaderen-met-overnachting-zeeland', 'Meerdaags & overnachten'),
    ('werkplek-zeeland', 'Werkplekken'),
    ('training-workshop-zeeland', 'Trainingen & workshops'),
    ('zakelijke-lunch-diner-zeeland', 'Zakelijke lunch & diner'),
]


def ref(identifier):
    return {'@id': identifier}


def value(source, pattern):
    return unescape(re.search(pattern, source, re.S).group(1)).strip()


def related_places():
    # These places are mentioned in the business pages and their combination panel.
    return [
        {'@type': 'Resort', '@id': RESORT, 'name': 'Resort Land & Zee',
         'url': ORIGIN + '/', 'hasOfferCatalog': ref(CATALOG),
         'containsPlace': [ref(HOTEL), ref(RESTAURANT)]},
        {'@type': 'Hotel', '@id': HOTEL, 'name': 'Hotel Land & Zee',
         'url': ORIGIN + '/hotel/', 'containedInPlace': ref(RESORT)},
        {'@type': 'Restaurant', '@id': RESTAURANT,
         'name': 'Restaurant Zeeuws Verlangen',
         'url': 'https://www.zeeuwsverlangen.nl/', 'containedInPlace': ref(RESORT)},
    ]


def service(slug, name):
    url = ORIGIN + '/' + slug + '/'
    source = (ROOT / slug / 'index.html').read_text()
    return {'@type': 'Service', '@id': url + '#service', 'name': name,
            'url': url, 'description': value(source, r'<p class="business-hero-lead">(.*?)</p>'),
            'serviceType': name, 'provider': ref(RESORT),
            'mainEntityOfPage': ref(url + '#webpage')}


def business_graph(slug=None, name=None):
    path = ROOT / slug / 'index.html' if slug else ROOT / 'zakelijk.html'
    source = path.read_text()
    old = json.loads(SCHEMA.search(source).group(0).split('>', 1)[1].rsplit('</script>', 1)[0])
    graph = old.get('@graph', [old])
    page = deepcopy(next(n for n in graph if n['@type'] in ('WebPage', 'CollectionPage')))
    page.pop('@context', None)
    url = page['url']
    page['description'] = value(source, r'<meta name="description"\s+content="(.*?)"')
    page['publisher'] = ref(RESORT)
    page['about'] = ref(RESORT)
    page['mentions'] = [ref(HOTEL), ref(RESTAURANT)]
    page['breadcrumb'] = ref(url + '#breadcrumbs')
    if slug:
        page['isPartOf'] = ref(HUB + '#webpage')
        page['mainEntity'] = ref(url + '#service')
        crumbs = deepcopy(next(n for n in graph if n['@type'] == 'BreadcrumbList'))
        # Preserve existing, visible breadcrumb labels and destinations.
        return {'@context': 'https://schema.org', '@graph':
                [page, crumbs, service(slug, name), *related_places()]}
    page['mainEntity'] = ref(CATALOG)
    crumbs = {'@type': 'BreadcrumbList', '@id': url + '#breadcrumbs',
              'itemListElement': [
                  {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': ORIGIN + '/'},
                  {'@type': 'ListItem', 'position': 2, 'name': 'Zakelijk', 'item': HUB}]}
    catalog = {'@type': 'OfferCatalog', '@id': CATALOG,
               'name': 'Zakelijke arrangementen bij Resort Land & Zee',
               'url': HUB, 'numberOfItems': len(OFFERS),
               'itemListElement': [
                   {'@type': 'Offer', 'name': label,
                    'url': ORIGIN + '/' + offer_slug + '/',
                    'seller': ref(RESORT),
                    'itemOffered': ref(ORIGIN + '/' + offer_slug + '/#service')}
                   for offer_slug, label in OFFERS]}
    return {'@context': 'https://schema.org', '@graph':
            [page, crumbs, catalog, *related_places(),
             *(service(s, n) for s, n in OFFERS)]}


def write_schema(path, data):
    source = path.read_text()
    block = '\n' + json.dumps(data, ensure_ascii=False, indent=2).replace('<', '\\u003c') + '\n    '
    updated, count = SCHEMA.subn(lambda m: m.group(1) + block + m.group(2), source)
    if count != 1:
        raise ValueError(f'Expected one JSON-LD block: {path}')
    path.write_text(updated)


def update():
    write_schema(ROOT / 'zakelijk.html', business_graph())
    for slug, name in OFFERS:
        write_schema(ROOT / slug / 'index.html', business_graph(slug, name))
    # Reuse the same identity on the existing resort and hotel pages, including
    # translations. Their language-specific descriptions remain untouched.
    for prefix in ('', 'en/', 'de/'):
        for relative, identifier in [('index.html', RESORT), ('hotel/index.html', HOTEL)]:
            path = ROOT / prefix / relative
            source = path.read_text()
            data = json.loads(SCHEMA.search(source).group(0).split('>', 1)[1].rsplit('</script>', 1)[0])
            data['@id'] = identifier
            if identifier == HOTEL:
                data['containedInPlace'] = ref(RESORT)
                # Repair the malformed Dutch image URL while using the same
                # existing hotel photo in each language.
                data['image'] = ORIGIN + '/images/Suite/Resort%20Land%20%26%20Zee%20-%20november%202025-61.webp'
            else:
                data['hasOfferCatalog'] = ref(CATALOG)
            write_schema(path, data)


if __name__ == '__main__':
    update()
