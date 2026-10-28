"""URL policy shared by source checks and the static deployment build."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
import json
import posixpath
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://landenzee.nl'
HOSTS = {'landenzee.nl', 'www.landenzee.nl'}
REDIRECTS = json.loads((ROOT / 'config/url-redirects.json').read_text())
EXCLUDED = {'.git', '.github', '.codex', '.agents', 'node_modules', 'dist', 'build', 'scripts', 'tests', 'docs', 'config', '__pycache__'}


def html_files(root=ROOT):
    return sorted(p for p in root.rglob('*.html') if not any(x in EXCLUDED for x in p.relative_to(root).parts))


def page_path(file, root=ROOT):
    relative = file.relative_to(root).as_posix()
    if relative == 'index.html':
        return '/'
    if relative.endswith('/index.html'):
        return '/' + relative[:-len('index.html')]
    return '/' + relative[:-len('.html')]


def page_routes(root=ROOT):
    return {page_path(p, root): p for p in html_files(root)}


def clean_path(path):
    path = posixpath.normpath('/' + unquote(path).lstrip('/'))
    if path.endswith('/index.html'):
        path = path[:-len('index.html')]
    elif path.endswith('.html'):
        path = path[:-len('.html')]
    return path


def canonical_path(path, routes):
    clean = clean_path(path)
    key = clean.rstrip('/') or '/'
    if key in REDIRECTS:
        return REDIRECTS[key]
    if clean in routes:
        return clean
    if clean + '/' in routes:
        return clean + '/'
    return None


def normalize_absolute(url, routes):
    parts = urlsplit(url)
    if parts.hostname not in HOSTS:
        return url
    path = canonical_path(parts.path, routes)
    if path and path.startswith('https://'):
        target = urlsplit(path)
        return urlunsplit((target.scheme, target.netloc, target.path, parts.query, parts.fragment))
    return urlunsplit(('https', 'landenzee.nl', path or parts.path, parts.query, parts.fragment))


class PageInfo(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.canonical = []
        self.alternates = {}
        self.links = []
        self.lang = None
        self.noindex = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a['href'])
        if tag == 'link' and a.get('rel') == 'alternate' and 'hreflang' in a:
            self.alternates[a['hreflang']] = a['href']
        if tag == 'meta' and a.get('name') == 'robots':
            self.noindex = 'noindex' in a.get('content', '')
        if tag == 'a' and 'href' in a:
            self.links.append(a['href'])


def online_href(href, file, routes):
    """Map local file navigation to canonical paths only in the deployed copy."""
    parts = urlsplit(href)
    if parts.scheme or parts.netloc:
        return normalize_absolute(href, routes)
    if not parts.path:
        return href
    relative = '/' + file.relative_to(ROOT).as_posix()
    absolute = urlsplit(urljoin(relative, href))
    target = canonical_path(absolute.path, routes)
    if not target or target == '/404':
        return href
    if target.startswith('https://'):
        dest = urlsplit(target)
        return urlunsplit((dest.scheme, dest.netloc, dest.path, parts.query, parts.fragment))
    return urlunsplit(('', '', target, parts.query, parts.fragment))


def redirect_html(target):
    """Pages-compatible client redirect; does not pretend to be an HTTP 301."""
    canonical = target if target.startswith('https://') else ORIGIN + target
    js_target = json.dumps(target)
    return f'''<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="{escape(canonical, quote=True)}">
    <meta http-equiv="refresh" content="0; url={escape(target, quote=True)}">
    <title>Pagina verplaatst | Resort Land &amp; Zee</title>
    <script>
        var target = new URL({js_target}, window.location.href);
        target.search = window.location.search;
        target.hash = window.location.hash;
        window.location.replace(target.href);
    </script>
</head>
<body><p>Deze pagina is verplaatst. <a href="{escape(target, quote=True)}">Ga naar de nieuwe pagina</a>.</p></body>
</html>
'''


def apache_config():
    lines = [
        '# Apache fallback only. GitHub Pages ignores .htaccess.',
        '# Source of legacy routes: config/url-redirects.json.',
        'RewriteEngine On', 'DirectoryIndex index.html', 'ErrorDocument 404 /404.html', '',
        '# Resolve legacy URLs directly before general URL normalization.'
    ]
    for source, target in REDIRECTS.items():
        lines.append(f'RewriteRule ^{re.escape(source.lstrip("/"))}(?:\\.html)?/?$ {target} [R=301,L,NE]')
    lines += [
        '', '# Redirect requested index.html URLs to their containing directory.',
        'RewriteCond %{THE_REQUEST} \\s/+(.*/)?index\\.html(?:[?\\s]) [NC]',
        'RewriteRule ^(.*/)?index\\.html$ /$1 [R=301,L,NE]',
        '', '# Existing flat HTML pages use extensionless canonical URLs.',
        'RewriteCond %{THE_REQUEST} \\s/+[^?\\ ]+\\.html(?:[?\\s]) [NC]',
        'RewriteCond %{REQUEST_FILENAME} -f',
        'RewriteRule ^(.+)\\.html$ /$1 [R=301,L,NE]',
        '', '# Preserve true directories; serve .html only for existing flat pages.',
        'RewriteCond %{REQUEST_FILENAME} !-d',
        'RewriteCond %{REQUEST_FILENAME} !-f',
        'RewriteCond %{REQUEST_FILENAME}.html -f',
        'RewriteRule ^(.+)$ $1.html [L]', ''
    ]
    return '\n'.join(lines)


def legacy_script(routes):
    # A 404 fallback can navigate, but cannot change the HTTP 404 to a 301.
    return '''// Generated from config/url-redirects.json and the existing page paths.
// Used only by the custom 404 page on static hosting.
(function () {
    if (window.location.protocol === 'file:') return;
    var redirects = ''' + json.dumps(REDIRECTS, ensure_ascii=False, indent=4) + ''';
    var paths = ''' + json.dumps(sorted(p for p in routes if p not in {'/404', '/zalen', '/bijeenkomsten'})) + ''';
    var path = window.location.pathname;
    var segments = path.split('/').filter(Boolean);
    var languageSegments = segments.filter(function (part) { return part === 'en' || part === 'de'; });
    if (languageSegments.length > 1) {
        var first = segments[0] === 'en' || segments[0] === 'de' ? segments[0] : null;
        segments = segments.filter(function (part) { return part !== 'en' && part !== 'de'; });
        if (first) segments.unshift(first);
        path = '/' + segments.join('/');
    }
    path = path.replace(/\\/index\\.html$/, '/').replace(/\\.html$/, '').replace(/\\/$/, '') || '/';
    var target = redirects[path];
    if (!target && paths.indexOf(path) !== -1) target = path;
    if (!target && paths.indexOf(path + '/') !== -1) target = path + '/';
    if (!target) return;
    var destination = new URL(target, window.location.origin);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    if (destination.href !== window.location.href) window.location.replace(destination.href);
})();
'''
