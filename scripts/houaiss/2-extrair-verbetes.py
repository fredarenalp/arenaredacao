import re,glob,json
L=[]
for f in sum([sorted(glob.glob(d+'/p-*.png.txt')) for d in ['pg','pg2','pg3','pg4','pg5','pg6','pg7','pg8','pg9']],[]):
    L+= [l.strip() for l in open(f).read().split('\n')]
CLS=r'(?:s\.?\s?[mf]\.?(?:\s?2n\.?|/f\.?|2g\.?)?|sm\.?|sf\.?|v\.|adj\.?(?:\s?2g\.?|\s?2n\.?)?|lj\.|adv\.|prep\.|loc\.|interj\.|pron\.|num\.|conj\.|art\.|sm2g\.|s\.2g\.|2g\.|sm\.?\s?2g)'
def cab(s):
    m=re.match(r'^([a-zà-ÿ][a-zà-ÿ\-\(\)]{1,30})\b(.{0,18}?)\s1\s',s)
    if not m: return None
    if re.search(r'[A-Za-zà-ÿ]{5,}',m.group(2)): return None
    return m.group(1)
ent=[];cur=None
for s in L:
    if not s: continue
    h=cab(s)
    if h:
        cur={'h':h,'t':s[len(h):]}; ent.append(cur)
    elif cur is not None:
        cur['t']+=' '+s
print('entradas brutas',len(ent))
ANT=re.compile(r'\s[\*“"”°º]*\s?(?:>|[ODÓ0Ɔᴐ⊃⊂]\s?>?|5>)(?=\s)')
out=[]
for e in ent:
    t=re.sub(r'(\w)- (\w)',r'\1\2',e['t'])
    t=re.sub(r'<[^>]*>','',t)             # exemplos de uso
    t=re.sub(r'<[^>]*$','',t)
    t=re.sub(r'\s*[☞☜]\s*sin\.\s*geral:.*?(?=\s\d+\s|$)','',t)
    partes=re.split(r'\s(?=\d{1,2}\s+[^\d:]{0,40}?:)',' '+t)
    sentidos=[]
    for p in partes:
        p=p.strip()
        m=re.match(r'^(\d{1,2})\s+([^:]{0,60}?):\s*(.*)$',p)
        if not m: continue
        gl,resto=m.group(2),m.group(3)
        resto=ANT.split(' '+resto+' ')[0]   # corta os antônimos
        ws=[]
        for w in re.split(r'[,;]',resto):
            w=re.sub(r'\([^)]*\)','',w) if False else w
            w=re.sub(r'\b(fig|infrm|pej|ant|bras|reg|gír|obsl|desus|chulo|poét|lus)\.\s*','',w).strip(' .')
            w=re.sub(r'\bver\b.*','',w).strip()
            if w and len(w)<=30 and len(w.split())<=3 and not re.search(r'\d',w): ws.append(w.lower())
        if ws: sentidos.append({'glosa':re.sub(r'^(fig|infrm|pej|bras)\.\s*','',gl).strip().lower(),'sin':ws})
    if sentidos: out.append({'palavra':e['h'].lower(),'sentidos':sentidos})
print('verbetes com sinônimos',len(out))
json.dump(out,open('houaiss_tudo.json','w'),ensure_ascii=False,indent=0)
