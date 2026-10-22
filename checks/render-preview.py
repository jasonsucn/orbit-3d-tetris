"""Temporary renderer-only fixture; never used in the final build."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
stub = '''window.OrbitEngine=class { constructor(callback){ this.callback=callback; this.state='ready';this.board=Array.from({length:20},()=>Array(10).fill(null));this.current=null;this.next=['I','O','T','S','L'];this.held=null;this.score=0;this.lines=0;this.level=1;this.elapsed=0;this.combo=0;this.canHold=true;} };'''
layout=(root/'layout.html').read_text(encoding='utf-8')
experience=(root/'experience.js').read_text(encoding='utf-8')
result=layout.replace('/*__ENGINE__*/',stub).replace('/*__EXPERIENCE__*/',experience)
(root/'checks'/'render-preview.html').write_text(result,encoding='utf-8')
print('Built isolated visual fixture: checks/render-preview.html')
