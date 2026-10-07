"""Validate the SMOG release contract without extracting or running an archive."""
import hashlib
import json
from pathlib import Path
import struct
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
version = json.loads((ROOT / 'package.json').read_text())['version']
names = ['smog_icon.ico', 'smog_logo.png', 'smog_header.png', 'smog_meta.xml', 'smog_launch.bat']
for name in names[:3]:
    assert (ROOT / name).stat().st_size < 8 * 1024 * 1024, name
icon = (ROOT / names[0]).read_bytes()
reserved, kind, count = struct.unpack_from('<HHH', icon)
assert reserved == 0 and kind == 1
sizes = {icon[6 + i * 16] or 256 for i in range(count)}
assert 256 in sizes, 'The executable icon must include a 256 px source'
for name in ['smog_logo.png', 'smog_header.png']:
    data = (ROOT / name).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack_from('>II', data, 16)
    assert width >= 256 and height >= 128 and width > height, 'Store artwork must be a landscape PNG'
assert (ROOT / 'smog_logo.png').read_bytes()[25] == 6, 'Logo must have an alpha channel'
metadata = ET.fromstring((ROOT / 'smog_meta.xml').read_bytes())
assert metadata.tag == 'smog' and metadata.findtext('version') == version
import fnmatch
assert fnmatch.fnmatch(f'Nuvori-{version}-windows-x64.zip', metadata.findtext('release/asset'))
launcher = (ROOT / 'smog_launch.bat').read_text()
assert '"Nuvori.exe"' in launcher and 'MyGame.exe' not in launcher, 'Launcher must invoke the packaged executable'
archive = ROOT / 'release' / f'Nuvori-{version}-windows-x64.zip'
with zipfile.ZipFile(archive) as z:
    assert not z.testzip(), 'Archive CRC failed'
    assert len(z.namelist()) == len(set(z.namelist())), 'Duplicate ZIP entries'
    assert z.read('Nuvori.exe')[:2] == b'MZ', 'Missing Windows executable at ZIP root'
    assert z.getinfo('resources/app.asar').file_size > 1000000, 'Missing compiled game'
    for name in names:
        assert z.read(name) == (ROOT / name).read_bytes(), name
    assert all(not n.startswith(('/', '\\')) and '..' not in n.split('/') and ':' not in n for n in z.namelist())
    assert not any('.env' in Path(n).name or 'node_modules/' in n for n in z.namelist())
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
(archive.parent / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
print(f'PASS: Windows x64 build, five SMOG files, artwork dimensions, icon sizes, metadata, ZIP integrity. {archive.stat().st_size:,} bytes. SHA256 {digest}')
