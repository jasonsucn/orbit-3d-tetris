"""Validate the final single-file HTML package without third-party libraries."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib

root = Path(__file__).resolve().parent.parent
source = (root / 'index.html').read_text(encoding='utf-8')

class Audit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = []
        self.scripts = 0
        self.ids = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script':
            self.scripts += 1
        if tag in ('script', 'img', 'link', 'iframe', 'source', 'audio', 'video'):
            for attr in ('src', 'href'):
                if attr in attrs and not attrs[attr].startswith(('data:', '#')):
                    self.resources.append((tag, attrs[attr]))

audit = Audit()
audit.feed(source)
assert audit.scripts == 2, audit.scripts
assert not audit.resources, audit.resources
assert len(audit.ids) == len(set(audit.ids)), 'duplicate DOM ids'
assert '/*__ENGINE__*/' not in source and '/*__EXPERIENCE__*/' not in source
assert "fetch(" not in source and 'XMLHttpRequest' not in source
assert (root / 'game-core.js').read_text(encoding='utf-8') in source
assert (root / 'experience.js').read_text(encoding='utf-8') in source
print('PASS: 2 inline scripts, unique DOM ids, no remote resources or runtime requests')
print('PASS: final HTML embeds latest game core and experience sources')
print('Size:', (root / 'index.html').stat().st_size, 'bytes')
print('SHA256:', hashlib.sha256(source.encode('utf-8')).hexdigest())
