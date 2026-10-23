"""Build a curated static site; never package logs, research, or local credentials."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]/'studio'
output=root/'dist'
output.mkdir(exist_ok=True)
for name in ['index.html','styles.css','app.mjs','state.mjs','repository.mjs']:
 shutil.copy2(root/name,output/name)
assets=output/'assets'
assets.mkdir(exist_ok=True)
for source in (root/'assets').iterdir():
 if source.suffix in ['.png','.svg','.mp4','.woff2']:
  shutil.copy2(source,assets/source.name)
assert len(list(assets.glob('*.mp4')))==27
print(f'Static site ready: {output}; 27 playable sample variants.')
