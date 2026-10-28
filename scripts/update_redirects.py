"""Refresh both hosting fallbacks after changing config/url-redirects.json."""
from site_urls import ROOT, apache_config, legacy_script, page_routes


if __name__ == '__main__':
    (ROOT / '.htaccess').write_text(apache_config())
    (ROOT / 'js/legacy-redirects.js').write_text(legacy_script(page_routes()))
    print('Updated Apache rules and the static 404 redirect fallback.')
