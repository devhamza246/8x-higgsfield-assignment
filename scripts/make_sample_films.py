"""Create deterministic sample motion films from the original bundled campaign still."""
import subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
assets=root/'studio/assets'
for preset,grade in [('forest','eq=saturation=0.85:brightness=-0.025'),('golden','colorbalance=rs=.10:bs=-.10,eq=saturation=.8:brightness=.02'),('noir','hue=s=.12,eq=brightness=-.07:contrast=1.08')]:
 for ratio,size,crop in [('wide','960x540','crop=iw:ih'),('social','360x640','crop=ih*9/16:ih:iw*.58-ih*9/32:0'),('square','540x540','crop=ih:ih:iw*.58-ih/2:0')]:
  for duration in [5,8,10]:
   output=assets/f'{preset}-{ratio}-{duration}.mp4'
   if output.exists():continue
   frames=duration*24
   vf=f"{crop},scale=1280:-2,zoompan=z='1.02+0.00025*on':x='iw*.5-iw/zoom*.5':y='ih*.5-ih/zoom*.5':d={frames}:s={size}:fps=24,{grade},format=yuv420p"
   subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(assets/'vela-forest.png'),'-vf',vf,'-t',str(duration),'-an','-c:v','libx264','-preset','veryfast','-crf','27','-movflags','+faststart',str(output)],check=True)
print('Prepared 27 sample films (3 looks × 3 formats × 3 durations).')
