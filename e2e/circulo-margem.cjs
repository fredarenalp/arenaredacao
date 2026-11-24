// Círculo em cima do número da linha: clicar nele seleciona o círculo (abre o AC) e NÃO abre o comentário da linha. Não grava no banco.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>console.log('ERRO JS',e.message.slice(0,150)));
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
if(!(await p.locator('.pcd').count())){await p.click('#phTabs [data-pt="co"]').catch(()=>{});await p.waitForTimeout(400)};const cards=await p.locator('.pcd').allInnerTexts();const idx=cards.findIndex(t=>/1ª versão ·/.test(t));await p.locator('.pcd').nth(Math.max(idx,0)).click();await p.waitForTimeout(600);
await (async()=>{if(await p.locator('#plGo').isEnabled().catch(()=>false))await p.locator('#plGo').click();else await p.locator('.plr').first().click()})();await p.waitForTimeout(2000);
await p.click('#mkClear');await p.waitForTimeout(300);if(await p.locator('#lmpOk').isVisible().catch(()=>false)){await p.click('#lmpOk');await p.waitForTimeout(600)} // começa sem marcas (o pacote aberto pode já ter sido corrigido)

const SH=async()=>{};
await p.click('[data-tool="o"]');await p.waitForTimeout(200);
const svg=await p.evaluate(()=>{const r=document.querySelector('#mk').getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
const px=(u,v)=>[svg[0]+svg[2]*u/210,svg[1]+svg[3]*v/297];
// 1) círculo no meio do texto
let [cx,cy]=px(70,60);await p.mouse.move(cx-18,cy);await p.mouse.down();await p.mouse.move(cx,cy+5,{steps:5});await p.mouse.move(cx+18,cy+10,{steps:5});await p.mouse.up();await p.waitForTimeout(500);
await p.click('#catp [data-sidetog="par"]');await p.waitForTimeout(300);await p.click('#catpS button[data-cat="pd"]');await p.waitForTimeout(500);
console.log('marcas:',await p.evaluate(()=>document.getElementById('mkc').textContent));
// 2) arrasta o círculo até a faixa dos números das linhas
const nh=await p.evaluate(()=>{const e=document.querySelector('.nh');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
console.log('centro de um número de linha:',nh.map(Math.round));
const [mx,my]=[cx,cy+5];
await p.mouse.move(mx,my);await p.mouse.down();await p.mouse.move((mx+nh[0])/2,(my+nh[1])/2,{steps:6});await p.mouse.move(nh[0],my,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
await p.keyboard.press('Escape');await p.waitForTimeout(300);
const estado=()=>p.evaluate(()=>({catp:!document.getElementById('catp').classList.contains('hide'),comentario:!document.getElementById('lc').classList.contains('hide')}));
console.log('depois de mover:',JSON.stringify(await estado()));
await p.mouse.click(nh[0],my);await p.waitForTimeout(700);
const fim=await estado();const certo=fim.catp&&!fim.comentario;console.log(certo?'ok   círculo sobre o número da linha é selecionável':'FALHA círculo sobre o número da linha abriu o comentário',JSON.stringify(fim));process.exitCode=certo?0:1;
await b.close()})()
