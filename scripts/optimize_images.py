"""Generate committed WebP sizes and update local HTML image references.

Run manually with Pillow installed; publication itself needs no image library.
Original files, crops and alt text are preserved. Re-run after adding photos.
"""
from hashlib import sha256
from html import escape, unescape
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

from PIL import Image, ImageOps
from site_urls import ROOT, html_files

OUTPUT = ROOT / 'images/responsive'
MANIFEST = ROOT / 'config/image-variants.json'
RASTER = {'.jpg', '.jpeg', '.png', '.webp'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr'}


def set_attr(tag, name, value):
    pattern = re.compile(r'\s+' + re.escape(name) + r'="[^"]*"')
    attribute = ' ' + name + '="' + escape(str(value), quote=True) + '"'
    if pattern.search(tag):
        return pattern.sub(lambda _: attribute, tag, count=1)
    return re.sub(r'\s*/?>$', lambda m: attribute + m.group(), tag, count=1)


def local_asset(page, url):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    file = ((ROOT / unquote(parts.path).lstrip('/')) if parts.path.startswith('/')
            else page.parent / unquote(parts.path)).resolve()
    if not file.is_relative_to(ROOT) or not file.is_file() or file.suffix.lower() not in RASTER:
        return None
    return file


class ImageOptimizer:
    def __init__(self):
        self.assets = {}
        self.elements = 0

    def asset(self, source):
        key = source.relative_to(ROOT).as_posix()
        if key in self.assets:
            return self.assets[key]
        digest = sha256(source.read_bytes()).hexdigest()
        stem = re.sub(r'[^a-z0-9]+', '-', source.stem.lower()).strip('-')[:48]
        identity = sha256(key.encode()).hexdigest()[:6] + '-' + digest[:8]
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            is_logo = '/Logo/' in '/' + key and image.mode in {'RGBA', 'LA', 'P'}
            widths = [160, 320, 640, 960] if is_logo else [480, 960, 1440, 1900]
            widths = sorted({min(width, image.width) for width in widths})
            variants = []
            for width in widths:
                target = OUTPUT / f'{stem}-{identity}-{width}.webp'
                height = max(1, round(image.height * width / image.width))
                if not target.exists():
                    resized = image.resize((width, height), Image.Resampling.LANCZOS)
                    if resized.mode not in {'RGB', 'RGBA'}:
                        resized = resized.convert('RGBA' if 'transparency' in original.info else 'RGB')
                    resized.save(target, 'WEBP', lossless=is_logo, quality=84, method=6,
                                 icc_profile=original.info.get('icc_profile', b''))
                # Keep the original WebP bytes at full resolution if another
                # encoding would be larger. Smaller variants still resize it.
                if (original.format == 'WEBP' and image.size == original.size
                        and width == image.width and source.stat().st_size < target.stat().st_size):
                    target.write_bytes(source.read_bytes())
                variants.append({'width': width, 'height': height,
                                 'file': target.relative_to(ROOT).as_posix(),
                                 'bytes': target.stat().st_size})
            asset = {'source_sha256': digest, 'source_bytes': source.stat().st_size,
                     'source_width': image.width, 'source_height': image.height,
                     'logo': is_logo, 'variants': variants}
        self.assets[key] = asset
        return asset

    def tag(self, page, raw, attrs, ancestors, first_content):
        original_url = attrs.get('data-image-original', attrs.get('src', ''))
        source = local_asset(page, original_url)
        if source is None:
            return raw, False
        asset = self.asset(source)
        relative = lambda file: os.path.relpath(ROOT / file, page.parent).replace(os.sep, '/')
        classes = set(attrs.get('class', '').split())
        context = ' '.join(a.get('class', '') for _, a in ancestors)
        is_menu = 'menu-image' in classes
        is_logo = asset['logo']
        is_header_logo = 'header-logo' in classes
        if is_logo:
            sizes = '(max-width: 768px) 160px, 210px' if is_header_logo else '280px'
        elif is_menu:
            sizes = '(min-width: 769px) max(45vw, 150vh), 45vw'
        elif 'business-hero-image' in classes:
            sizes = '(max-width: 768px) 90vw, 43vw'
        elif 'business-offer-card' in context:
            sizes = '(max-width: 768px) 90vw, (max-width: 1024px) 44vw, 28vw'
        elif 'business-photo-grid--single' in context:
            sizes = '(max-width: 868px) 90vw, 780px'
        elif 'business-photo-grid' in context or 'room-card' in context:
            sizes = '(max-width: 768px) 90vw, 44vw'
        elif any('hero' in c for c in classes) or any('hero' in a.get('class', '') for _, a in ancestors):
            # Full-bleed covers may need more pixels than the viewport width
            # when cropped in a tall mobile hero.
            sizes = '(max-width: 768px) max(100vw, 105vh), 100vw'
        else:
            sizes = '(max-width: 768px) 90vw, 90vw'
        variants = asset['variants']
        fallback = next((v for v in variants if v['width'] >= (320 if is_logo else 960)), variants[-1])
        for name, value in {
            'data-image-original': original_url,
            'src': relative(fallback['file']),
            'srcset': ', '.join(relative(v['file']) + ' ' + str(v['width']) + 'w' for v in variants),
            'sizes': sizes, 'width': fallback['width'], 'height': fallback['height'],
            'decoding': 'async'
        }.items():
            raw = set_attr(raw, name, value)
        critical = is_header_logo or (not is_menu and not is_logo and first_content) or attrs.get('fetchpriority') == 'high'
        raw = set_attr(raw, 'loading', 'eager' if critical else 'lazy')
        if critical and not is_header_logo:
            raw = set_attr(raw, 'fetchpriority', 'high')
        self.elements += 1
        return raw, not is_menu and not is_logo


class PageImages(HTMLParser):
    def __init__(self, source, page, optimizer):
        super().__init__(convert_charrefs=False)
        self.source, self.page, self.optimizer = source, page, optimizer
        self.offsets = [0]
        self.offsets.extend(m.end() for m in re.finditer('\n', source))
        self.stack, self.edits = [], []
        self.content_seen = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img':
            raw = self.get_starttag_text()
            line, column = self.getpos()
            start = self.offsets[line - 1] + column
            updated, content = self.optimizer.tag(self.page, raw, attrs, self.stack, not self.content_seen)
            self.edits.append((start, start + len(raw), updated))
            self.content_seen = self.content_seen or content
        if tag not in VOID:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def render(self):
        source = self.source
        for start, end, updated in reversed(self.edits):
            source = source[:start] + updated + source[end:]
        return source


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    optimizer = ImageOptimizer()
    pages = 0
    for page in html_files():
        source = page.read_text()
        updated = PageImages(source, page, optimizer).render()
        if updated != source:
            page.write_text(updated)
            pages += 1
    # Existing CSS backgrounds use the same derivatives, with a mobile override.
    css = ROOT / 'css/style.css'
    source = css.read_text()
    source = re.sub(r'\n/\* Responsive photo backgrounds \*/.*?\n/\* End responsive photo backgrounds \*/\n?', '', source, flags=re.S)
    replacements = []
    for selector, filename in [('bg-hotel', 'images/Suite/Resort Land & Zee - november 2025-51.webp'),
                               ('bg-accommodaties', 'images/Ecologde/Resort Land & Zee - november 2025-102.webp')]:
        asset = optimizer.asset(ROOT / filename)
        variants = asset['variants']
        desktop = variants[-1]['file']
        mobile = next((v['file'] for v in variants if v['width'] >= 960), desktop)
        source, count = re.subn(r'(\.' + selector + r'\s*\{\s*background-image:\s*url\()[^)]*(\);)',
                                lambda m: m[1] + "'../" + desktop + "'" + m[2], source, count=1)
        if count != 1:
            raise ValueError('Missing CSS background: ' + selector)
        replacements.append(f"    .{selector} {{ background-image: url('../{mobile}'); "
                            f"background-image: image-set(url('../{mobile}') 1x, url('../{desktop}') 2x); }}")
    source += '\n/* Responsive photo backgrounds */\n@media (max-width: 768px) {\n' + '\n'.join(replacements) + '\n}\n/* End responsive photo backgrounds */\n'
    css.write_text(source)
    MANIFEST.write_text(json.dumps({'assets': optimizer.assets}, ensure_ascii=False, indent=2) + '\n')
    print(f'Updated {pages} pages, {optimizer.elements} image elements, {len(optimizer.assets)} original assets.')


if __name__ == '__main__':
    main()
