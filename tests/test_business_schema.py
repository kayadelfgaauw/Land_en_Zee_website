"""Check business entity links, content fidelity and publication output."""
import contextlib
from html import unescape
import io
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_site import build
from update_business_schema import ROOT, ORIGIN, RESORT, HOTEL, RESTAURANT, HUB, OFFERS


def data(path):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', path.read_text(), re.S)
    if len(blocks) != 1:
        raise AssertionError(f'Expected one schema block in {path}')
    return json.loads(blocks[0])


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


class BusinessSchemaTest(unittest.TestCase):
    def test_each_page_describes_its_own_service_and_existing_breadcrumb(self):
        for slug, label in OFFERS:
            with self.subTest(slug=slug):
                path = ROOT / slug / 'index.html'
                source = unescape(path.read_text())
                graph = {n['@id']: n for n in data(path)['@graph']}
                url = ORIGIN + '/' + slug + '/'
                page = graph[url + '#webpage']
                service = graph[page['mainEntity']['@id']]
                self.assertEqual(service['@type'], 'Service')
                self.assertEqual(service['url'], url)
                self.assertEqual(service['name'], label)
                self.assertIn(service['description'], source)
                self.assertEqual(service['provider'], {'@id': RESORT})
                self.assertEqual(service['mainEntityOfPage'], {'@id': page['@id']})
                self.assertEqual(page['isPartOf'], {'@id': HUB + '#webpage'})
                crumbs = graph[page['breadcrumb']['@id']]['itemListElement']
                self.assertEqual([c['position'] for c in crumbs], [1, 2, 3])
                self.assertEqual([c['item'] for c in crumbs], [ORIGIN + '/', HUB, url])
                self.assertIn('>' + crumbs[-1]['name'] + '<', source)
                self.assertEqual(graph[HOTEL]['containedInPlace'], {'@id': RESORT})
                self.assertEqual(graph[RESTAURANT]['containedInPlace'], {'@id': RESORT})

    def test_catalog_has_exactly_the_visible_seven_offers_and_resolved_references(self):
        path = ROOT / 'zakelijk.html'
        schema = data(path)
        graph = {n['@id']: n for n in schema['@graph']}
        page = graph[HUB + '#webpage']
        catalog = graph[page['mainEntity']['@id']]
        self.assertEqual(page['@type'], 'CollectionPage')
        self.assertEqual(catalog['@type'], 'OfferCatalog')
        self.assertEqual(catalog['numberOfItems'], 7)
        self.assertEqual(len(catalog['itemListElement']), 7)
        for offer, (slug, label) in zip(catalog['itemListElement'], OFFERS):
            self.assertEqual(offer['name'], label)
            self.assertIn(slug + '/index.html', path.read_text())
            self.assertEqual(graph[offer['itemOffered']['@id']]['name'], label)
        known = dict(graph)
        for slug, _ in OFFERS:
            known.update({n['@id']: n for n in data(ROOT / slug / 'index.html')['@graph']})
        for node in walk(schema):
            if set(node) == {'@id'}:
                self.assertIn(node['@id'], known)

    def test_no_unconfirmed_commercial_details_or_broken_local_images(self):
        files = [ROOT / 'zakelijk.html', *(ROOT / s / 'index.html' for s, _ in OFFERS)]
        forbidden = {'price', 'priceRange', 'priceSpecification', 'availability',
                     'maximumAttendeeCapacity', 'aggregateRating', 'review', 'starRating'}
        for path in files:
            for node in walk(data(path)):
                self.assertFalse(forbidden.intersection(node), path)
        for prefix in ('', 'en/', 'de/'):
            resort = data(ROOT / prefix / 'index.html')
            hotel = data(ROOT / prefix / 'hotel/index.html')
            self.assertEqual(resort['@id'], RESORT)
            self.assertEqual(hotel['@id'], HOTEL)
            self.assertEqual(hotel['containedInPlace'], {'@id': RESORT})
            self.assertTrue((ROOT / unquote(urlsplit(hotel['image']).path).lstrip('/')).is_file())

    def test_publishing_preserves_structured_data(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'site'
            with contextlib.redirect_stdout(io.StringIO()):
                build(output)
            for relative in ['zakelijk.html', *(s + '/index.html' for s, _ in OFFERS)]:
                self.assertEqual(data(ROOT / relative), data(output / relative))


if __name__ == '__main__':
    unittest.main()
