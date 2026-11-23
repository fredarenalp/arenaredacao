// Parágrafo desalinhado: os círculos se ligam por uma linha reta e grossa e o número da linha ganha um ponto cheio. Não grava no banco.
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
const cards=await p.locator('.pcd').allInnerTexts();const idx=cards.findIndex(t=>/1ª versão ·/.test(t));await p.locator('.pcd').nth(Math.max(idx,0)).click();await p.waitForTimeout(600);
await p.locator('#plGo').click();await p.waitForTimeout(2000);
await p.click('[data-tool="o"]');await p.waitForTimeout(200);
const svg=await p.evaluate(()=>{const r=document.querySelector('#mk').getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
const px=(u,v)=>[svg[0]+svg[2]*u/210,svg[1]+svg[3]*v/297];
const n=async(s)=>p.locator(s).count();
const marca=async(u,v)=>{const [x,y]=px(u,v);await p.mouse.move(x-16,y);await p.mouse.down();await p.mouse.move(x,y+4,{steps:4});await p.mouse.move(x+16,y+8,{steps:4});await p.mouse.up();await p.waitForTimeout(450);
  await p.click('#catp [data-sidetog="par"]');await p.waitForTimeout(250);await p.click('#catpS button[data-cat="pd"]');await p.waitForTimeout(450)};
await marca(70,70);ok(await n('#mk .pdl')===0&&await n('#mk .pdn')===1,'um círculo: só o ponto no número da linha, sem linha');
await marca(55,110);ok(await n('#mk .pdl')===1&&await n('#mk .pdn')===2,'dois círculos: uma linha ligando');
await marca(90,150);ok(await n('#mk .pdl')===2&&await n('#mk .pdn')===3,'três círculos: duas linhas');
const gr=await p.evaluate(()=>{const l=document.querySelector('#mk .pdl');return getComputedStyle(l).strokeWidth+'|'+getComputedStyle(l).pointerEvents});console.log('   estilo da linha:',gr);
await p.screenshot({path:'/tmp/claude-0/-home-user/8b0ef16d-a90f-56a1-a546-1333957514b8/scratchpad/caca/pd_linha.png'});
await p.keyboard.press('Escape');await p.keyboard.press('Control+z');await p.waitForTimeout(400);
ok(await n('#mk .pdl')===1&&await n('#mk .pdn')===2,'desfazer (Ctrl+Z) remove o último círculo e a linha dele');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
