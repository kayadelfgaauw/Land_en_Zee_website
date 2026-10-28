"""Regression checks for navigation and accessible entry points across the site."""
from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from site_urls import html_files


class Elements(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class AccessibilityMarkupTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = [(p, Elements(p.read_text())) for p in html_files() if 'js/main.js' in p.read_text()]

    def test_shared_accessibility_assets_and_skip_target(self):
        for file, page in self.pages:
            with self.subTest(page=file):
                mains = [a for tag, a in page.tags if tag == 'main']
                if mains:
                    self.assertEqual(len(mains), 1)
                    self.assertEqual(mains[0]['tabindex'], '-1')
                    skips = [a for tag, a in page.tags if a.get('class') == 'skip-link']
                    self.assertEqual(skips[0]['href'], '#' + mains[0]['id'])
                for ending in ['css/accessibility.css', 'js/dialogs.js']:
                    matches = [a for tag, a in page.tags if a.get('src', a.get('href', '')).endswith(ending)]
                    self.assertEqual(len(matches), 1)
                    self.assertTrue((file.parent / matches[0].get('src', matches[0].get('href'))).is_file())

    def test_closed_navigation_is_named_inert_and_linked_to_its_trigger(self):
        for file, page in self.pages:
            with self.subTest(page=file):
                dialog = next(a for tag, a in page.tags if a.get('class') == 'fullscreen-menu')
                trigger = next(a for tag, a in page.tags if 'menu-trigger' in a.get('class', '').split())
                self.assertEqual(dialog['role'], 'dialog')
                self.assertTrue(dialog['aria-label'])
                self.assertEqual(dialog['aria-hidden'], 'true')
                self.assertIn('inert', dialog)
                self.assertEqual(trigger['aria-controls'], dialog['id'])
                self.assertEqual(trigger['aria-expanded'], 'false')

    def test_visible_frames_have_names_and_background_videos_do_not_autoload(self):
        for file, page in self.pages:
            for tag, attrs in page.tags:
                if tag != 'iframe' or 'googletagmanager.com' in attrs.get('src', ''):
                    continue
                with self.subTest(page=file):
                    self.assertTrue(attrs.get('title'))
                    if 'mediadelivery.net' in attrs.get('data-video-src', ''):
                        self.assertIn('hidden', attrs)
                        self.assertNotIn('src', attrs)

    def test_business_fields_have_labels_and_correct_input_purposes(self):
        for file, page in self.pages:
            if 'business-request-form' not in file.read_text():
                continue
            labels = {attrs['for'] for tag, attrs in page.tags if tag == 'label'}
            for tag, attrs in page.tags:
                if tag in {'input', 'select', 'textarea'} and attrs.get('type') != 'hidden':
                    with self.subTest(page=file, field=attrs.get('id')):
                        self.assertIn(attrs['id'], labels)
                        if attrs.get('name') in {'email', 'firstname', 'lastname', 'company', 'phone'}:
                            self.assertIn('autocomplete', attrs)


if __name__ == '__main__':
    unittest.main()
