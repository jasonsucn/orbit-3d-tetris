"""Build ORBIT's fully self-contained, offline HTML edition."""
from pathlib import Path

root = Path(__file__).resolve().parent
layout = (root / "layout.html").read_text(encoding="utf-8")
engine = (root / "game-core.js").read_text(encoding="utf-8")
experience = (root / "experience.js").read_text(encoding="utf-8")
assert layout.count("/*__ENGINE__*/") == 1
assert layout.count("/*__EXPERIENCE__*/") == 1
for name, source in [("engine", engine), ("experience", experience)]:
    assert "</script" not in source.lower(), f"Unescaped script terminator in {name}"
result = layout.replace("/*__ENGINE__*/", engine).replace("/*__EXPERIENCE__*/", experience)
path = root / "index.html"
path.write_text(result, encoding="utf-8")
print(f"Built {path.name}: {len(result.encode('utf-8')):,} bytes — entirely offline")
