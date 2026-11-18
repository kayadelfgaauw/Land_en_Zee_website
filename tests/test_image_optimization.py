"""Check responsive candidates and loading priority without a Pillow dependency."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import unittest
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from site_urls import ROOT, html_files


class Images(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.images = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.images.append(dict(attrs))


class ImageOptimizationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.assets = json.loads((ROOT / 'config/image-variants.json').read_text())['assets']
        cls.pages = [(p, Images(p.read_text()).images) for p in html_files()]

    def test_variants_exist_and_match_manifest(self):
        for source, asset in self.assets.items():
            self.assertTrue((ROOT / source).is_file(), source)
            widths = [v['width'] for v in asset['variants']]
            self.assertEqual(widths, sorted(set(widths)))
            self.assertLessEqual(max(widths), asset['source_width'])
            for variant in asset['variants']:
                file = ROOT / variant['file']
                with self.subTest(file=file):
                    self.assertEqual(file.stat().st_size, variant['bytes'])
                    with file.open('rb') as image:
                        header = image.read(12)
                    self.assertEqual(header[:4], b'RIFF')
                    self.assertEqual(header[8:12], b'WEBP')

    def test_each_optimized_image_has_valid_candidates_and_reserved_dimensions(self):
        for page, images in self.pages:
            for image in images:
                if 'data-image-original' not in image:
                    continue
                source = (page.parent / unquote(image['data-image-original'])).resolve()
                asset = self.assets[source.relative_to(ROOT).as_posix()]
                expected = {v['width']: ROOT / v['file'] for v in asset['variants']}
                actual = {}
                for candidate in image['srcset'].split(','):
                    url, descriptor = candidate.strip().rsplit(' ', 1)
                    actual[int(descriptor[:-1])] = (page.parent / url).resolve()
                with self.subTest(page=page, image=image['src']):
                    self.assertEqual(actual, expected)
                    self.assertTrue(image['sizes'])
                    fallback = (page.parent / image['src']).resolve()
                    variant = next(v for v in asset['variants'] if ROOT / v['file'] == fallback)
                    self.assertEqual(int(image['width']), variant['width'])
                    self.assertEqual(int(image['height']), variant['height'])
                    self.assertEqual(image['decoding'], 'async')

    def test_header_and_critical_images_are_eager_and_menu_photos_are_lazy(self):
        for page, images in self.pages:
            for image in images:
                if 'data-image-original' not in image:
                    continue
                classes = image.get('class', '').split()
                if 'header-logo' in classes or image.get('fetchpriority') == 'high':
                    self.assertEqual(image['loading'], 'eager', page)
                if 'menu-image' in classes:
                    self.assertEqual(image['loading'], 'lazy', page)


if __name__ == '__main__':
    unittest.main()
