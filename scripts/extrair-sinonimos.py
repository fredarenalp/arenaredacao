#!/usr/bin/env python3
"""Extrai os verbetes do 'Dicionário de Sinônimos da Língua Portuguesa' (Rocha Pombo, ABL) dos PDFs.
Uso: python3 scripts/extrair-sinonimos.py <pasta com os PDFs parte1..5> <saida.json>
O JSON gerado NÃO deve ir para o repositório (público). Carregue-o no banco com scripts/semear-sinonimos.mjs."""
import glob, json, re, subprocess, sys, unicodedata

pasta, saida = sys.argv[1], sys.argv[2]
norm = lambda w: ''.join(c for c in unicodedata.normalize('NFD', w.lower()) if unicodedata.category(c) != 'Mn').strip()
txt = ''
for f in sorted(glob.glob(pasta + '/*parte*.pdf'), key=lambda p: int(re.search(r'parte(\d+)', p).group(1))):
    txt += subprocess.run(['pdftotext', f, '-'], capture_output=True, text=True).stdout.replace('\x0c', '\n') + '\n'
linhas = []
for l in txt.split('\n'):
    s = l.strip()
    if re.match(r'^\d+\s+Rocha\s*Pom\s*bo\s*$', s) or re.match(r'^Dicionário de Sinônimos da Língua Portuguesa\s+\d+\s*$', s):
        continue
    linhas.append(s)
ini = []
for i, s in enumerate(linhas):
    if re.fullmatch(r'\d{1,4}', s):
        j = i + 1
        while j < len(linhas) and linhas[j] == '':
            j += 1
        if j < len(linhas) and re.match(r'^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç\-]*[,\s]', linhas[j]):
            ini.append((i, int(s), j))
seq, ultimo = [], 0
for it in ini:  # os números dos verbetes crescem de 1 em 1: descarta o que sai da sequência
    if it[1] > ultimo and it[1] - ultimo <= 5:
        seq.append(it); ultimo = it[1]
out = []
for k, (i, n, j) in enumerate(seq):
    fim = seq[k + 1][0] if k + 1 < len(seq) else len(linhas)
    corpo = re.sub(r'(\w)- (\w)', r'\1\2', ' '.join(x for x in linhas[j:fim] if x))
    m = re.search(r'\s[–-]\s', corpo)
    cab = re.sub(r'\([^)]*\)', '', corpo[:m.start()] if m else corpo[:200])
    m2 = re.search(r'\.\s', cab)
    if m2: cab = cab[:m2.start()]
    sentidos = []
    for sec in cab.split(';'):
        ws = [w.strip().strip('.').strip().lower() for w in sec.split(',')]
        ws = [w for w in ws if w and len(w) <= 30 and len(w.split()) <= 3]
        if ws: sentidos.append(ws)
    flat = [w for s in sentidos for w in s]
    if len(flat) >= 2:
        out.append({'id': n, 'sentidos': sentidos, 'palavras': flat, 'norm': sorted({norm(w) for w in flat})})
json.dump(out, open(saida, 'w'), ensure_ascii=False)
print(len(out), 'verbetes extraídos (de', ultimo, 'numerados)')
