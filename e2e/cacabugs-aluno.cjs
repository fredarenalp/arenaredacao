const { chromium, devices } = require('playwright');
const RUIM=/undefined|NaN|\[object|Infinity/;
const ach=[];const ok=(m)=>console.log('ok   ',m);const falha=(m)=>{ach.push(m);console.log('FALHA',m)};
async function roda(nome,ctxOpts){
const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const ctx=await b.newContext({...ctxOpts,ignoreHTTPSErrors:true});const p=await ctx.newPage();
p.on('pageerror',e=>falha(nome+' ERRO JS: '+e.message.slice(0,160)));
p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon/.test(m.text()))falha(nome+' console: '+m.text().slice(0,140))});
p.on('response',r=>{if(/supabase\.co/.test(r.url())&&r.status()>=400&&r.status()!==406&&!/auth\/v1\/token/.test(r.url()))falha(nome+' HTTP '+r.status()+' '+r.url().replace(/^https:\/\/[^/]+/,'').slice(0,80))});
p.on('dialog',d=>d.accept());
const T=async(s)=>{try{return (await p.innerText(s)).replace(/\s+/g,' ')}catch{return ''}};
const ruim=async(onde)=>{const t=(await T('body'));const m=t.match(RUIM);if(m)falha(nome+' TEXTO RUIM ('+onde+'): …'+t.slice(Math.max(0,m.index-50),m.index+30)+'…')};
const passo=async(n,fn)=>{try{await fn();await ruim(n);ok(nome+' '+n)}catch(e){falha(nome+' '+n+' → '+String(e.message).split('\n')[0].slice(0,140))}};
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=aluno]');await p.fill('#mat','0000');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('body.in-aluno',{timeout:25000});await p.waitForTimeout(1500);
await passo('abas principais',async()=>{for(const k of ['lista','bol','crit','feed','lista']){await p.click('[data-al="'+k+'"]');await p.waitForTimeout(1500);if(k==='feed'){while(await p.locator('.ai-peek[data-ai="prox"]').count())await p.click('.ai-peek');await p.click('.ai-peek');await p.waitForTimeout(400)}}});
await passo('boletim: subseções',async()=>{await p.click('[data-al="bol"]');await p.waitForTimeout(500);for(const k of ['at','evo','med','at']){await p.click('[data-bt="'+k+'"]');await p.waitForTimeout(300)}});
await passo('destaques: abas',async()=>{await p.click('[data-al="feed"]');await p.waitForTimeout(2000);await p.click('.ai-skip').catch(()=>{});await p.waitForTimeout(300);for(const t of ['red','err','meu']){await p.click('[data-fd-t="'+t+'"]').catch(()=>{});await p.waitForTimeout(250)}});
// correções
const ks=await p.evaluate(()=>window.__aluno.PROPS.map((q,k)=>({k,kind:q.kind,nota:q.nota})).filter(x=>x.kind==='corr').map(x=>x.k));
console.log(nome,'correções do aluno:',ks.length);
for(const k of ks){await passo('correção '+k+' (tela completa)',async()=>{if(!(await p.locator('[data-al="lista"]').count())){await p.locator('text=Minhas propostas').first().click();await p.waitForTimeout(400)}await p.click('[data-al="lista"]');await p.waitForTimeout(300);await p.evaluate((k)=>window.__aluno.verCorrecao(k),k);await p.waitForTimeout(800);
  for(const t of ['txt','crit','cri','por']){}
  const abas=await p.locator('#alMain [data-tab],#alMain .vsw2 button,#alMain [role=tab]').count();
  for(let i=0;i<abas;i++){await p.locator('#alMain [data-tab],#alMain .vsw2 button,#alMain [role=tab]').nth(i).click({timeout:2000}).catch(()=>{});await p.waitForTimeout(150)}});
 await passo('correção '+k+' (análise em cartões)',async()=>{if(await p.locator('#alIntro:not(.hide)').count()){await p.click('.ai-skip');await p.waitForTimeout(400)} /* 1ª vez (aluno de teste reinicia a cada login): os cartões já abrem sozinhos */const b=p.locator('text=Ver análise em cartões');if(!(await b.count()))throw new Error('sem botão de análise');await b.click();await p.waitForTimeout(600);let n=0;while(await p.locator('.ai-peek[data-ai="prox"]').count()&&n<14){await p.click('.ai-peek');await p.waitForTimeout(250);n++}
  if(await p.locator('[data-ai="duvida"]').count()){await p.click('[data-ai="duvida"]');await p.waitForTimeout(500);for(const a of ['tabp','tabg','tabn']){await p.click('[data-ai="'+a+'"]').catch(()=>{});await p.waitForTimeout(200)}await p.click('[data-ai="plfecha"]').catch(()=>{})}
  await p.click('.ai-skip').catch(()=>{});await p.waitForTimeout(300)})}
// injeção de marcas de todos os tipos novos na primeira correção
if(ks.length)await passo('injeção: marcas de todos os tipos',async()=>{await p.evaluate((k)=>{const P=window.__aluno.PROPS[k];P.fotoUrl='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';P.circ=[{l:2,x:60,c:'ti'},{l:5,x:70,c:'ac',xm:1},{l:6,x:90,c:'pt',xm:1},{l:7,x:80,c:'or',w:'excessão'},{l:8,x:70,c:'ce',w:'assim',s:['Porém','Contudo'],f:'oposicao'},{l:9,x:100,c:'ca',s:['Por isso','Portanto'],f:'conclusao'},{l:10,x:90,c:'ca'},{l:11,x:70,c:'pr',w:'coisa',s:['objeto','assunto']},{l:12,x:60,c:'rp',w:'também'},{l:13,x:60,c:'ss'},{l:14,x:70,c:'il'},{l:15,x:70,c:'mi'},{l:16,x:70,c:'ol'},{l:17,x:70,c:'cn'},{l:18,x:70,c:'ra'},{l:19,x:70,c:'mr'},{l:20,x:70,c:'lac'},{l:21,x:70,c:'ele'},{l:22,x:70,c:'el'},{l:24,x:60,c:'pd'},{l:28,x:84,c:'pd'}];window.__aluno.verCorrecao(k)},ks[0]);await p.waitForTimeout(1000);
  const pdl=await p.evaluate(()=>({tela:document.querySelectorAll('#crK .pdl').length,pontos:document.querySelectorAll('#crK .pdn').length}));if(pdl.tela!==1||pdl.pontos!==2)throw new Error('Parágrafo desalinhado na tela do aluno: '+JSON.stringify(pdl));
  const imp=await p.evaluate(()=>{window.__arenaImp&&window.__arenaImp();return document.querySelectorAll('#printArea .pdl').length});if(imp!==1)throw new Error('Parágrafo desalinhado na impressão: '+imp+' linha(s)');
  const t=await T('#alMain');if(/undefined/.test(t))throw new Error('undefined na correção com marcas injetadas');
  const n=await p.locator('#alMain svg .xm').count();if(n<10)throw new Error('poucas marcas desenhadas: '+n);
  const xs=await p.locator('#alMain svg .xm path.xx').count();if(xs!==2)throw new Error('X esperado 2, achei '+xs);
  if(await p.locator('#alIntro:not(.hide)').count()){await p.click('.ai-skip');await p.waitForTimeout(400)} /* 1ª vez (aluno de teste reinicia a cada login): os cartões já abrem sozinhos */
  const b=p.locator('text=Ver análise em cartões');await b.click();await p.waitForTimeout(600);let c=0;const vistos=[];while(c<14){vistos.push(await T('#aiCard'));if(!(await p.locator('.ai-peek[data-ai="prox"]').count()))break;await p.click('.ai-peek');await p.waitForTimeout(250);c++}
  const all=vistos.join(' | ');for(const must of ['Conectivo','Experimente']){if(!all.includes(must))console.log('   (aviso) cartões não mostram "'+must+'"')}
  await p.click('.ai-skip').catch(()=>{})});
await b.close()}
(async()=>{await roda('desktop',{viewport:{width:1366,height:900}});await roda('celular',{...devices['Pixel 7']});
console.log('\nTOTAL DE FALHAS (aluno):',ach.length);ach.forEach(a=>console.log(' -',a))})()
