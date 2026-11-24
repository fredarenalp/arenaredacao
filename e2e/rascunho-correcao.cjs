// Rascunho automático: marcações e nível feitos e NÃO salvos voltam depois de fechar e reabrir a janela. Não grava no banco (nunca clica em Salvar).
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const ctx=await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true});
const abre=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
 await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
 if(!(await p.locator('.pcd').count())){await p.click('#phTabs [data-pt="co"]').catch(()=>{});await p.waitForTimeout(400)};const cards=await p.locator('.pcd').allInnerTexts();const idx=cards.findIndex(t=>/1ª versão ·/.test(t));await p.locator('.pcd').nth(Math.max(idx,0)).click();await p.waitForTimeout(600);
 await (async()=>{if(await p.locator('#plGo').isEnabled().catch(()=>false))await p.locator('#plGo').click();else await p.locator('.plr').first().click()})();await p.waitForTimeout(2000);return p};
// 1ª janela: marca e escolhe níveis, sem salvar
let p=await abre();
await p.click('#mkClear');await p.waitForTimeout(300);if(await p.locator('#lmpOk').isVisible().catch(()=>false)){await p.click('#lmpOk');await p.waitForTimeout(600)} // começa sem marcas (o pacote aberto pode já ter sido corrigido)
await p.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('arena_rasc_')).forEach(k=>localStorage.removeItem(k))});
await p.click('[data-tool="o"]');
const svg=await p.evaluate(()=>{const r=document.querySelector('#mk').getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
const px=(u,v)=>[svg[0]+svg[2]*u/210,svg[1]+svg[3]*v/297];
for(const [u,v] of [[70,70],[90,110]]){const [x,y]=px(u,v);await p.mouse.move(x-16,y);await p.mouse.down();await p.mouse.move(x,y+4,{steps:4});await p.mouse.move(x+16,y+8,{steps:4});await p.mouse.up();await p.waitForTimeout(450);await p.click('#catp button[data-cat="ac"]');await p.waitForTimeout(300)}
await p.click('[data-acf="cr"]').catch(()=>{});for(let k=0;k<5;k++)await p.locator('.rc .lv').nth(k).locator('button[data-n="3"]').click();
const antes=await p.evaluate(()=>({desv:document.getElementById('mkc').textContent,niv:[...document.querySelectorAll('.rc .lv')].map(l=>(l.querySelector('button.on,button.sel,button[aria-pressed="true"]')||{}).dataset?.n)}));
console.log('   antes de fechar:',JSON.stringify(antes));
await p.waitForTimeout(4000); // o rascunho é gravado a cada 3 s
const temRasc=await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('arena_rasc_')));
ok(temRasc,'rascunho gravado no navegador depois de marcar e escolher níveis');
const sujoAviso=await p.evaluate(()=>new Promise(r=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);r(e.defaultPrevented)}));
ok(sujoAviso,'fechar a janela com correção não salva pede confirmação');
await p.close();
// 2ª janela: mesmo navegador (simula fechar e abrir de novo)
p=await abre();
const depois=await p.evaluate(()=>({desv:document.getElementById('mkc').textContent,toast:document.getElementById('toast').textContent}));
console.log('   depois de reabrir:',JSON.stringify(depois));
ok(/2 desvios/.test(depois.desv),'as 2 marcações voltaram');
ok(/Rascunho recuperado/.test(depois.toast),'aviso "Rascunho recuperado" na tela');
const nivDepois=await p.evaluate(()=>[...document.querySelectorAll('.rc .lv')].map(l=>(l.querySelector('button.on,button.sel,button[aria-pressed="true"]')||{}).dataset?.n));
ok(JSON.stringify(nivDepois)===JSON.stringify(antes.niv),'os níveis escolhidos voltaram '+JSON.stringify(nivDepois));
await p.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('arena_rasc_')).forEach(k=>localStorage.removeItem(k))});
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
