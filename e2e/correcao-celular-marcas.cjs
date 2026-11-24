// Celular (390x800): o AC completo nunca abre. Tocar numa marca (ou criar círculo por toque duplo) abre a gaveta "marca selecionada":
// trocar tipo, mudar de critério, opções na gaveta, mover pela alça, remover. Não grava no banco.
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true});
const p=await ctx.newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(1000);
await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('arena_rasc_')).forEach(k=>localStorage.removeItem(k)));
if(!(await p.locator('.pcd').count())){await p.click('#phTabs [data-pt="co"]').catch(()=>{});await p.waitForTimeout(400)};await p.locator('.pcd').first().click();await p.waitForTimeout(700);await (async()=>{if(await p.locator('#plGo').isEnabled().catch(()=>false))await p.locator('#plGo').click();else await p.locator('.plr').first().click()})();await p.waitForTimeout(1800);
const marcas=()=>p.evaluate(()=>document.querySelectorAll('#mk g.xm:not(.pv)').length);
const acCheio=()=>p.evaluate(()=>{const c=document.getElementById('catp');return !c.classList.contains('hide')&&getComputedStyle(c).visibility!=='hidden'&&!c.classList.contains('rpc')&&!c.classList.contains('pick')});
const rotulo=()=>p.evaluate(()=>{const g=[...document.querySelectorAll('#mk g.xm:not(.pv)')].pop();const t=g&&g.querySelector('text.cl');return t?t.textContent:''});
const centro=()=>p.evaluate(()=>{const g=[...document.querySelectorAll('#mk g.xm:not(.pv)')].pop();const e=g.querySelector('ellipse');const r=document.getElementById('mk').getBoundingClientRect();return [r.left+r.width*(+e.getAttribute('cx'))/210,r.top+r.height*(+e.getAttribute('cy'))/297]});
const tipoAtual=async()=>{await toca();const x=await p.locator('#mDr .mdrh b').innerText();await p.click('#mDrX');await p.waitForTimeout(250);return x};
const toca=async()=>{const [x,y]=await centro();await p.touchscreen.tap(x,y);await p.waitForTimeout(500)};
// 1) cria uma rasura pelo fluxo da gaveta
await p.locator('.mchip').nth(0).click();await p.waitForTimeout(300);await p.locator('#mDr [data-md="ra"]').click();await p.waitForTimeout(300);await p.click('#mPronto');await p.waitForTimeout(500);
ok(await marcas()===1&&!(await acCheio()),'rasura criada pela gaveta, sem AC');
// 2) tocar na marca abre a gaveta da marca (não o AC)
await toca();
ok(await p.locator('#mDr .mcat.on').count()===1&&(await p.locator('#mDr .mdrh b').innerText()).includes('Rasura'),'tocar na marca abre a gaveta "marca selecionada" com o tipo atual destacado');
ok(!(await acCheio())&&await p.locator('#mGrip').count()===1,'o AC completo não abre e a alça aparece');
// 3) trocar o tipo (mesmo critério)
await p.locator('#mDr [data-md="ma"]').click();await p.waitForTimeout(500);
ok(!(await acCheio())&&/margem/i.test(await tipoAtual()),'trocar para "Passou da margem" muda a marca e fecha a gaveta');
// 4) outro critério, categoria simples
await toca();await p.locator('#mDr [data-msc="1"]').click();await p.waitForTimeout(300);
ok(await p.locator('#mDr [data-md="ac"]').count()===1,'mudar de critério (II) troca a lista de categorias da gaveta');
await p.locator('#mDr [data-md="il"]').click();await p.waitForTimeout(500);
ok(!(await acCheio())&&/Ilegib/i.test(await tipoAtual()),'Ilegibilidade aplicada');
// 5) categoria com opções, a partir de uma marca existente
await toca();await p.locator('#mDr [data-msc="1"]').click();await p.waitForTimeout(300);await p.locator('#mDr [data-md="or"]').click();await p.waitForTimeout(800);
ok(await p.evaluate(()=>!document.getElementById('catpS').classList.contains('hide'))&&!(await acCheio()),'Ortografia: a palavra correta abre na gaveta, sem AC');
await p.fill('#orW','excessão');await p.click('#catpS [data-ortok="1"]');await p.waitForTimeout(600);
ok(/exce/i.test(await rotulo())&&await marcas()===1,'Ortografia aplicada à marca existente ('+await rotulo()+')');
// 6) mover pela alça com a gaveta da marca aberta
await toca();
const c0=await centro();const g=await p.evaluate(()=>{const r=document.getElementById('mGrip').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
const cdp=await ctx.newCDPSession(p);const toque=async(t,x,y)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:t==='touchEnd'?[]:[{x,y,id:1}]});
await toque('touchStart',g[0],g[1]);for(let k=1;k<=8;k++)await toque('touchMove',g[0]-k*6,g[1]+k*3);await toque('touchEnd');await p.waitForTimeout(400);
const c1=await centro();
ok(Math.abs(c1[0]-c0[0])>8,'arrastar a alça move a marca existente ('+c0.map(Math.round)+' → '+c1.map(Math.round)+')');
// 7) remover
await p.locator('#mRem').click();await p.waitForTimeout(400);
ok(await marcas()===0,'"Remover esta marca" tira a marca');
// 8) criar círculo por toque duplo: gaveta sem AC
const r=await p.evaluate(()=>{const e=document.getElementById('mk').getBoundingClientRect();return [e.left+e.width*.4,e.top+e.height*.3]});
await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(120);await p.touchscreen.tap(r[0],r[1]);await p.waitForTimeout(700);
ok(await marcas()===1&&!(await acCheio())&&(await p.locator('#mDr .mdrh b').innerText()).includes('sem tipo'),'toque duplo cria um círculo e abre a gaveta "marca sem tipo" (sem AC)');
await p.locator('#mDr [data-md="ra"]').click();await p.waitForTimeout(500);
ok(/Rasura/i.test(await tipoAtual()),'escolher o tipo na gaveta classifica o círculo');
// 9) sinal que falta (acento, pontuação): pela gaveta do critério II
const sg0=await p.evaluate(()=>document.querySelectorAll('#mk .sg').length);
await p.locator('.mchip').nth(1).click({force:true});await p.waitForTimeout(300);
ok(await p.locator('#mDr [data-msym]').count()===8,'critério II traz a linha "Sinal que falta" com 8 sinais');
await p.locator('#mDr [data-msym="~"]').click();await p.waitForTimeout(400);await p.click('#mPronto');await p.waitForTimeout(600);
ok(await p.evaluate(()=>document.querySelectorAll('#mk .sg').length)===sg0+1&&!(await acCheio()),'tocar num sinal e em Pronto cria a marca de sinal ausente, sem AC');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
