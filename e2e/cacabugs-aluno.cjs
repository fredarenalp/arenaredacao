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
await passo('abas principais',async()=>{for(const k of ['lista','bol','crit','prop','lista']){await p.click('[data-al="'+k+'"]');await p.waitForTimeout(800)}});
await passo('boletim: subseções',async()=>{await p.click('[data-al="bol"]');await p.waitForTimeout(500);for(const k of ['at','evo','med','tr','at']){await p.click('[data-bt="'+k+'"]');await p.waitForTimeout(300)}});
await passo('propostas: bimestres, detalhe e voltar',async()=>{await p.click('[data-al="prop"]');await p.waitForTimeout(500);for(const b of [1,2,4]){await p.click('[data-bim="'+b+'"]');await p.waitForTimeout(250)}await p.click('.pz-row[data-vp]');await p.waitForTimeout(400);await p.click('#vpVolta');await p.waitForTimeout(300);if(!(await p.locator('.pz-list').count()))throw new Error('voltar do detalhe não retornou à lista de Propostas');await p.click('[data-al="lista"]');await p.waitForTimeout(300);if(await p.locator('.pc2 [data-vp]').count())throw new Error('o card não deve ter botão de proposta (só a aba Propostas)')});
// correções
const ks=await p.evaluate(()=>window.__aluno.PROPS.map((q,k)=>({k,kind:q.kind,nota:q.nota})).filter(x=>x.kind==='corr').map(x=>x.k));
console.log(nome,'correções do aluno:',ks.length);
for(const k of ks){await passo('correção '+k+' (tela completa)',async()=>{if(!(await p.locator('[data-al="lista"]').count())){await p.locator('text=Minhas redações').first().click();await p.waitForTimeout(400)}await p.click('[data-al="lista"]');await p.waitForTimeout(300);await p.evaluate((k)=>window.__aluno.verCorrecao(k),k);await p.waitForTimeout(800);
  for(const t of ['txt','crit','cri','por']){}
  const abas=await p.locator('#alMain [data-tab],#alMain .vsw2 button,#alMain [role=tab]').count();
  for(let i=0;i<abas;i++){await p.locator('#alMain [data-tab],#alMain .vsw2 button,#alMain [role=tab]').nth(i).click({timeout:2000}).catch(()=>{});await p.waitForTimeout(150)}});
 await passo('correção '+k+' (análise em cartões)',async()=>{if(await p.locator('#alIntro:not(.hide)').count()){await p.click('.ai-skip',{timeout:3000}).catch(()=>{});await p.waitForTimeout(400)} /* 1ª vez (aluno de teste reinicia a cada login): os cartões já abrem sozinhos *//* o botão 'Ver análise em cartões' foi retirado: os cartões só abrem na 1ª vez *//* cartão único: sem a seta lateral */ if(await p.locator('.ai-peek').count())throw new Error('a seta lateral do cartão deveria ter saído');if(await p.locator('.aiq-t').count())throw new Error('os 5 quadrados deveriam ter saído do cartão inicial');
  if(await p.locator('[data-ai="duvida"]').isVisible().catch(()=>false)){await p.click('[data-ai="duvida"]');await p.waitForTimeout(500);for(const a of ['tabp','tabg']){await p.click('[data-ai="'+a+'"]').catch(()=>{});await p.waitForTimeout(200)}await p.click('[data-ai="plfecha"]').catch(()=>{})}
  await p.click('.ai-skip').catch(()=>{});await p.waitForTimeout(300)})}
// injeção de marcas de todos os tipos novos na primeira correção
if(ks.length)await passo('injeção: marcas de todos os tipos',async()=>{await p.evaluate((k)=>{const P=window.__aluno.PROPS[k];P.fotoUrl='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';P.circ=[{l:2,x:60,c:'ti'},{l:5,x:70,c:'ac',xm:1},{l:6,x:90,c:'pt',xm:1},{l:7,x:80,c:'or',w:'excessão'},{l:8,x:70,c:'ce',w:'assim',s:['Porém','Contudo'],f:'oposicao'},{l:9,x:100,c:'ca',s:['Por isso','Portanto'],f:'conclusao'},{l:10,x:90,c:'ca'},{l:11,x:70,c:'pr',w:'coisa',s:['objeto','assunto']},{l:12,x:60,c:'rp',w:'também'},{l:25,x:70,c:'rp',w:'também'},{l:27,x:90,c:'rp',w:'também'},{l:13,x:60,c:'ss'},{l:14,x:70,c:'il'},{l:15,x:70,c:'mi'},{l:16,x:70,c:'ol'},{l:17,x:70,c:'cn'},{l:18,x:70,c:'ra'},{l:19,x:70,c:'mr'},{l:20,x:70,c:'lac'},{l:21,x:70,c:'ele'},{l:22,x:70,c:'el'},{l:24,x:60,c:'pd'},{l:28,x:84,c:'pd'}];window.__aluno.verCorrecao(k)},ks[0]);await p.waitForTimeout(1000);
  const pdl=await p.evaluate(()=>({tela:document.querySelectorAll('#crK .pdl').length,pontos:document.querySelectorAll('#crK .pdn').length}));if(pdl.tela!==1||pdl.pontos!==2)throw new Error('Parágrafo desalinhado na tela do aluno: '+JSON.stringify(pdl));
  const rps=await p.evaluate(()=>document.querySelectorAll('#crK .rpar').length);if(rps!==2)throw new Error('Setas de repetição na tela do aluno: '+rps+' (esperado 2, para 3 círculos da mesma palavra)');
  const rpi=await p.evaluate(()=>{window.__arenaImp&&window.__arenaImp();return document.querySelectorAll('#printArea .rpar').length});if(rpi!==2)throw new Error('Setas de repetição na impressão: '+rpi);
  // clicar num círculo (qualquer tipo, com ou sem comentário) abre o balão com o significado
  const nCx=await p.locator('#crK .cxh').count();if(nCx<10)throw new Error('poucas áreas de toque nos círculos: '+nCx);
  for(let i=0;i<nCx;i++){await p.evaluate((i)=>document.querySelectorAll('#crK .cxh')[i].dispatchEvent(new MouseEvent('click',{bubbles:true})),i);await p.waitForTimeout(60);const r=await p.evaluate(()=>{const po=document.getElementById('crPop');return {vis:!po.classList.contains('hide'),t:po.innerText}});if(!r.vis||!r.t.trim())throw new Error('balão do círculo '+i+' não abriu');if(/undefined|\[object/.test(r.t))throw new Error('texto ruim no balão: '+r.t)}
  await p.evaluate(()=>document.querySelector('#crPop .px').click());if(!(await p.evaluate(()=>document.getElementById('crPop').classList.contains('hide'))))throw new Error('o × não fechou o balão');
  // modo tela cheia: botão ao lado do zoom, gaveta com o comentário, navegação ‹ › e Esc
  if(!(await p.locator('#crFull').isVisible()))throw new Error('botão de tela cheia não aparece');
  await p.click('#crFull');await p.waitForTimeout(400);
  const fm1=await p.evaluate(()=>({aberto:!!document.getElementById('crFM'),cnt:(document.querySelector('.fm-cnt')||{}).innerText,sh:(document.querySelector('.fm-sh')||{}).innerText||''}));
  if(!fm1.aberto||!/^1 de \d+$/.test(fm1.cnt)||!fm1.sh.trim())throw new Error('tela cheia não abriu direito: '+JSON.stringify(fm1));
  if(/undefined|\[object/.test(fm1.sh))throw new Error('texto ruim na gaveta: '+fm1.sh);
  await p.click('.fm-sh [data-fn="1"]');await p.waitForTimeout(250);
  const fm2=await p.evaluate(()=>document.querySelector('.fm-cnt').innerText);if(!/^2 de /.test(fm2))throw new Error('o botão › não avançou: '+fm2);
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  if(await p.evaluate(()=>!!document.getElementById('crFM')))throw new Error('Esc não fechou a tela cheia');

  const imp=await p.evaluate(()=>{window.__arenaImp&&window.__arenaImp();return document.querySelectorAll('#printArea .pdl').length});if(imp!==1)throw new Error('Parágrafo desalinhado na impressão: '+imp+' linha(s)');
  const t=await T('#alMain');if(/undefined/.test(t))throw new Error('undefined na correção com marcas injetadas');
  const n=await p.locator('#alMain svg .xm').count();if(n<10)throw new Error('poucas marcas desenhadas: '+n);
  const xs=await p.locator('#alMain svg .xm path.xx').count();if(xs!==2)throw new Error('X esperado 2, achei '+xs);
  if(await p.locator('#alIntro:not(.hide)').count()){await p.click('.ai-skip');await p.waitForTimeout(400)} /* 1ª vez (aluno de teste reinicia a cada login): os cartões já abrem sozinhos */
  let c=0;const vistos=[];vistos.push(await T('#aiCard'));
  const all=vistos.join(' | ');for(const must of ['Conectivo','Experimente']){if(!all.includes(must))console.log('   (aviso) cartões não mostram "'+must+'"')}
  await p.click('.ai-skip').catch(()=>{})});
await b.close()}
(async()=>{await roda('desktop',{viewport:{width:1366,height:900}});await roda('celular',{...devices['Pixel 7']});
console.log('\nTOTAL DE FALHAS (aluno):',ach.length);ach.forEach(a=>console.log(' -',a))})()
