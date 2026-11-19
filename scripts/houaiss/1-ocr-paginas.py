import sys,glob,subprocess,os
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
def um(f):
    i=Image.open(f).convert('L'); w,h=i.size
    out=[]
    for k,(a,b) in enumerate([(0,w//2),(w//2,w)]):
        c=i.crop((a,int(h*.085),b,int(h*.955)))
        p=f+f'.c{k}.png'; c.save(p)
        t=subprocess.run(['tesseract',p,'-','-l','por','--psm','6'],capture_output=True,text=True,env=dict(os.environ,OMP_THREAD_LIMIT='1')).stdout
        os.remove(p); out.append(t)
    open(f+'.txt','w').write('\n'.join(out)); return f
fs=[f for f in sorted(glob.glob('pg/p-*.png')) if not os.path.exists(f+'.txt')]
with ThreadPoolExecutor(os.cpu_count()) as ex: list(ex.map(um,fs))
print('ok',len(fs))
