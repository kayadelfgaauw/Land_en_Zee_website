"""Prepare a static Pages deployment; keep source links usable over file://."""
import argparse
from html import escape, unescape
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import re
import shutil

from site_urls import ROOT, REDIRECTS, EXCLUDED, html_files, online_href, page_routes, redirect_html, apache_config


def build(output):
    output = output.resolve()
    if output == ROOT or output in ROOT.parents:
        raise ValueError('Output must not be the repository or one of its parents')
    if output.exists() and any(output.iterdir()):
        raise ValueError(f'Output must be empty: {output}')
    output.mkdir(parents=True, exist_ok=True)
    routes = page_routes()
    for file in ROOT.rglob('*'):
        rel = file.relative_to(ROOT)
        if output == file or output in file.parents or any(x in EXCLUDED for x in rel.parts):
            continue
        if any(part.startswith('.') and part not in {'.htaccess', '.nojekyll'} for part in rel.parts):
            continue
        if not file.is_file() or file.is_symlink():
            continue
        if file.suffix in {'.patch', '.log', '.pyc'}:
            continue
        target = output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
    for file in html_files():
        target = output / file.relative_to(ROOT)
        source = target.read_text()
        # Rewrite anchor navigation, not canonical metadata or external bookings.
        def anchor(match):
            tag = match.group(0)
            def href(m):
                url = online_href(unescape(m.group(1)), file, routes)
                return 'href="' + escape(url, quote=True) + '"'
            return re.sub(r'href="([^"]*)"', href, tag)
        source = re.sub(r'<a\b[^>]*>', anchor, source)
        # A custom 404 is served at unknown, possibly nested paths.
        if file.name == '404.html':
            def asset(m):
                attr, url = m.groups()
                if urlsplit(url).scheme or url.startswith(('#', '/')):
                    return m.group(0)
                return attr + '="' + escape(urljoin('/', unescape(url)), quote=True) + '"'
            source = re.sub(r'(href|src)="([^"]*)"', asset, source)
        target.write_text(source)
    for source, destination in REDIRECTS.items():
        for suffix in ['.html', '/index.html']:
            target = output / (source.lstrip('/') + suffix)
            # Only existing legacy redirect stubs may be replaced.
            if source in routes and source not in {'/zalen', '/bijeenkomsten'}:
                raise ValueError(f'Redirect would replace a real page: {source}')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(redirect_html(destination))
    (output / '.htaccess').write_text(apache_config())
    (output / '.nojekyll').touch()
    print(f'Prepared {len(routes) - 3} indexable pages in {output}; {len(REDIRECTS)} legacy routes covered.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    build(parser.parse_args().output)
