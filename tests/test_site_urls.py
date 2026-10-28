"""Check source metadata and the actual output of the publication build."""
import contextlib
from html import unescape
import io
from pathlib import Path
import re
import sys
import tempfile
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from site_urls import (ROOT, ORIGIN, REDIRECTS, PageInfo, apache_config, canonical_path,
                       html_files, legacy_script, normalize_absolute, online_href, page_routes)
from prepare_site import build


class SiteURLsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.routes = page_routes()
        cls.pages = {path: PageInfo(file.read_text()) for path, file in cls.routes.items()}
        cls.indexable = {path: info for path, info in cls.pages.items() if not info.noindex}
        cls.temp = tempfile.TemporaryDirectory(prefix='land-en-zee-url-test-')
        cls.output = Path(cls.temp.name) / 'site'
        with contextlib.redirect_stdout(io.StringIO()):
            build(cls.output)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_every_indexable_page_has_its_own_canonical(self):
        for path, info in self.indexable.items():
            with self.subTest(path=path):
                self.assertEqual(info.canonical, [ORIGIN + path])
                self.assertNotIn('https://www.landenzee.nl', self.routes[path].read_text())
        self.assertNotIn('/404', self.indexable)
        self.assertNotIn('/zalen', self.indexable)
        self.assertNotIn('/bijeenkomsten', self.indexable)

    def test_translation_links_are_real_reciprocal_and_self_referencing(self):
        for path, info in self.indexable.items():
            if not info.alternates:
                continue
            with self.subTest(path=path):
                self.assertEqual(info.alternates[info.lang], ORIGIN + path)
                self.assertEqual(info.alternates['x-default'], info.alternates['nl'])
                for language, url in info.alternates.items():
                    target = self.indexable[urlsplit(url).path]
                    self.assertEqual(target.alternates, info.alternates)
                    if language != 'x-default':
                        self.assertEqual(target.lang, language)

    def test_sitemap_has_exactly_the_canonicals_and_matching_translations(self):
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}
        sitemap = ET.parse(ROOT / 'sitemap.xml').getroot()
        seen = []
        for entry in sitemap.findall('s:url', ns):
            url = entry.findtext('s:loc', namespaces=ns)
            seen.append(url)
            info = self.indexable[urlsplit(url).path]
            self.assertEqual(url, info.canonical[0])
            alternates = {el.attrib['hreflang']: el.attrib['href'] for el in entry.findall('x:link', ns)}
            self.assertEqual(alternates, info.alternates)
        self.assertEqual(len(seen), len(set(seen)))
        self.assertEqual(set(seen), {ORIGIN + p for p in self.indexable})
        self.assertIn('Sitemap: ' + ORIGIN + '/sitemap.xml', (ROOT / 'robots.txt').read_text())
        self.assertEqual((ROOT / 'CNAME').read_text().strip(), urlsplit(ORIGIN).hostname)

    def test_local_file_links_stay_local_and_resolve(self):
        for file in html_files():
            for href in PageInfo(file.read_text()).links:
                parts = urlsplit(href)
                if parts.scheme or not parts.path or not parts.path.endswith('.html'):
                    continue
                with self.subTest(file=file.relative_to(ROOT), href=href):
                    target = ROOT / parts.path.lstrip('/') if parts.path.startswith('/') else file.parent / parts.path
                    self.assertTrue(target.is_file())
        for slug in ['teamuitje-zeeland', 'vergaderen-zeeland', 'heisessie-zeeland']:
            self.assertIn(f'{slug}/index.html', PageInfo((ROOT / 'zakelijk.html').read_text()).links)

    def test_published_links_use_the_canonical_paths(self):
        for path, source in self.routes.items():
            if path in {'/zalen', '/bijeenkomsten'}:
                continue
            published = PageInfo((self.output / source.relative_to(ROOT)).read_text())
            for href in published.links:
                parts = urlsplit(href)
                if parts.scheme and parts.hostname != 'landenzee.nl':
                    continue
                if not parts.path:
                    continue
                canonical = canonical_path(parts.path, self.routes)
                if canonical and not canonical.startswith('https://') and canonical != '/404':
                    with self.subTest(page=path, href=href):
                        self.assertEqual(parts.path, canonical)
                        self.assertIn(canonical, self.indexable)
                        self.assertFalse(parts.path.endswith('.html'))

    def test_query_strings_fragments_and_external_bookings_survive(self):
        file = ROOT / 'en/hotel/index.html'
        self.assertEqual(online_href('../../zakelijk.html?utm_source=test#aanvraag-formulier', file, self.routes),
                         '/zakelijk?utm_source=test#aanvraag-formulier')
        self.assertEqual(online_href('../index.html', file, self.routes), '/en/')
        self.assertEqual(online_href('../../teamuitje-zeeland/index.html', file, self.routes), '/teamuitje-zeeland/')
        self.assertEqual(online_href('#aanvraag-formulier', file, self.routes), '#aanvraag-formulier')
        external = 'https://booking.example.com/reserve?hotel=1&lang=en#start'
        self.assertEqual(online_href(external, file, self.routes), external)
        self.assertEqual(normalize_absolute('http://www.landenzee.nl/en/contact-en-route?x=1#route', self.routes),
                         'https://landenzee.nl/en/contact?x=1#route')

    def test_legacy_paths_have_direct_targets_and_static_entry_files(self):
        for source, target in REDIRECTS.items():
            self.assertNotIn(target.rstrip('/'), REDIRECTS)
            if not target.startswith('https://'):
                self.assertIn(target, self.indexable)
            for suffix in ['', '/', '.html', '/index.html']:
                self.assertEqual(canonical_path(source + suffix, self.routes), target)
            for suffix in ['.html', '/index.html']:
                stub = (self.output / (source.lstrip('/') + suffix)).read_text()
                self.assertIn('http-equiv="refresh"', stub)
                self.assertIn('window.location.search', stub)
                self.assertIn('window.location.hash', stub)
                self.assertEqual(PageInfo(stub).canonical, [target if target.startswith('https://') else ORIGIN + target])
                self.assertTrue(PageInfo(stub).noindex)

    def test_404_assets_are_root_relative_and_unknown_paths_stay_unknown(self):
        html = (self.output / '404.html').read_text()
        for attr, url in re.findall(r'(href|src)="([^"]*)"', html):
            if not urlsplit(unescape(url)).scheme and not url.startswith('#'):
                self.assertTrue(url.startswith('/'), url)
        self.assertIsNone(canonical_path('/de/unbekannte-seite', self.routes))
        self.assertIsNone(canonical_path('/en/contact-other', self.routes))

    def test_redirect_configurations_do_not_drift(self):
        self.assertEqual((ROOT / '.htaccess').read_text(), apache_config())
        self.assertEqual((ROOT / 'js/legacy-redirects.js').read_text(), legacy_script(self.routes))
        self.assertIn('R=301', apache_config())
        for source, target in REDIRECTS.items():
            self.assertIn(re.escape(source.lstrip('/')), apache_config())
        self.assertTrue((self.output / '.nojekyll').is_file())
        for private in ['.git', '.github', 'config', 'scripts', 'tests', 'docs', 'run_test.patch']:
            self.assertFalse((self.output / private).exists())

    def test_build_rejects_nonempty_or_unsafe_output(self):
        with self.assertRaises(ValueError):
            build(ROOT)
        with self.assertRaises(ValueError):
            build(ROOT.parent)
        with self.assertRaises(ValueError):
            build(self.output)


if __name__ == '__main__':
    unittest.main()
