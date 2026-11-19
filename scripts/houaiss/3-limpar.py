import json,re,unicodedata
n=lambda w:''.join(c for c in unicodedata.normalize('NFD',w.lower()) if unicodedata.category(c)!='Mn')
d=json.load(open('houaiss_tudo.json'))
LIG={'de','da','do','das','dos','a','o','as','os','se','em','por','com','para','ao','à','no','na','que','um','uma','sem','e'}
MARC=re.compile(r'[>»«&\*\|“”"<=\[\]{}•●♦§°º]|\s{2,}')
def variantes(w):
    """expande (a)bater -> abater, bater ; devot(ad)o -> devotado, devoto"""
    m=re.search(r'\(([a-zà-ÿ]{1,4})\)',w)
    if not m: return [w]
    com=w.replace('(','').replace(')','')
    sem=w[:m.start()]+w[m.end():]
    return [com,sem]
def ok(w):
    if not re.fullmatch(r"[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*(?: [a-zà-ÿ\-]+){0,2}",w): return False
    if len(w.replace(' ',''))<2 or len(w)>28: return False
    p=w.split(' ')
    if len(p)>1 and not any(x in LIG for x in p) and '-' not in w: return False  # "contratempo incômodo" (vírgula perdida)
    if len(p)>1 and p[0] in LIG: return False
    if re.search(r'(.)\1\1',w): return False
    return True
def limpa_sin(lst):
    out=[]
    for t in lst:
        cortou=False
        if MARC.search(t):
            t=MARC.split(t)[0]; cortou=True       # o que vem depois do marcador é antônimo/lixo
        t=t.strip(' .:;,-·')
        t=re.sub(r'^\(?ver\)?$','',t)
        ws=[]
        for v in variantes(t.strip()):
            v=re.sub(r'\s*\([^)]*$','',v).strip()   # "(" solto
            v=re.sub(r'\b(fig|infrm|pej|ant|bras|reg|gír|obsl|desus|chulo|poét|lus|ver)\b\.?','',v).strip()
            if v and ok(v): ws.append(v)
        out+=ws
        if cortou: break                      # para no marcador
    seen=[];[seen.append(x) for x in out if x not in seen]
    return seen
def limpa_gl(g):
    g=re.sub(r'\([^)]*\)?','',g); g=re.sub(r'\b(fig|infrm|pej|bras|fis|reg)\.?\s*','',g)
    return g.strip(' .:;,-').lower()
w=[n(o['palavra']) for o in d]
res=[];desc={'fora_de_ordem':0,'sem_sentido':0}
for i,o in enumerate(d):
    # fora de ordem: inicial diferente dos dois vizinhos
    if 0<i<len(d)-1 and w[i][0]!=w[i-1][0] and w[i][0]!=w[i+1][0]: desc['fora_de_ordem']+=1; continue
    hs=[h for h in variantes(re.sub(r'\s+','',o['palavra'])) if re.fullmatch(r'[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*',h) and len(h)>=2]
    if not hs: desc['sem_sentido']+=1; continue
    sent=[]
    for s in o['sentidos']:
        sin=[x for x in limpa_sin(s['sin']) if n(x) not in {n(h) for h in hs}]
        if sin: sent.append({'glosa':limpa_gl(s['glosa']),'sin':sin})
    if not sent: desc['sem_sentido']+=1; continue
    res.append({'palavra':hs[0],'variantes':hs,'sentidos':sent})
tot=sum(len(s['sin']) for o in res for s in o['sentidos'])
print('verbetes',len(res),'descartados',desc,'| sentidos',sum(len(o['sentidos']) for o in res),'| sinônimos',tot)
antes=sum(len(s['sin']) for o in d for s in o['sentidos']); print('sinônimos antes:',antes)
json.dump(res,open('houaiss_limpo.json','w'),ensure_ascii=False)
for p in ('coisa','problema','mostrar','fazer','agarrado'):
    for o in [x for x in res if x['palavra']==p][:1]:
        print(p.upper(),'→',' | '.join(f"{s['glosa']}: {', '.join(s['sin'][:5])}" for s in o['sentidos'][:4]))
