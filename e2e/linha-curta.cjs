// Linha curta e Parágrafo curto: o círculo vira uma linha reta. Clicar no número da linha não abre o comentário. Não grava no banco.
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
const cards=await p.locator('.pcd').allInnerTexts();const idx=cards.findIndex(t=>/1ª versão ·/.test(t));await p.locator('.pcd').nth(Math.max(idx,0)).click();await p.waitForTimeout(600);
await p.locator('#plGo').click();await p.waitForTimeout(2000);
await p.click('[data-tool="o"]');
const svg=await p.evaluate(()=>{const r=document.querySelector('#mk').getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
const px=(u,v)=>[svg[0]+svg[2]*u/210,svg[1]+svg[3]*v/297];
const n=(s)=>p.locator(s).count();
const arrasta=async(u,v)=>{const [x,y]=px(u,v);await p.mouse.move(x-16,y);await p.mouse.down();await p.mouse.move(x,y+4,{steps:4});await p.mouse.move(x+16,y+8,{steps:4});await p.mouse.up();await p.waitForTimeout(450)};
// linha curta (mr) está no grupo "Rasura e margem" da Estética; parágrafo curto (pc) no painel Parágrafo
await arrasta(120,70);
const mrBtn=p.locator('#catp button[data-cat="mr"]');await mrBtn.click();await p.waitForTimeout(400);
ok(await n('#mk .xm path.xx.ln')===1,'Linha curta: o círculo virou uma linha reta');
await p.keyboard.press('Escape');
await arrasta(80,120);
await p.click('#catp [data-sidetog="par"]');await p.waitForTimeout(300);await p.click('#catpS button[data-cat="pc"]');await p.waitForTimeout(400);
ok(await n('#mk .xm path.xx.ln')===2,'Parágrafo curto: o círculo virou uma linha reta');
const mantem=await p.evaluate(()=>[...document.querySelectorAll('#mk .xm.est ellipse:not(.xe)')].length);
ok(mantem===0,'não sobrou círculo visível nessas duas marcas');
await p.screenshot({path:'/tmp/claude-0/-home-user/8b0ef16d-a90f-56a1-a546-1333957514b8/scratchpad/caca/linha_curta.png'});
await p.keyboard.press('Escape');await p.waitForTimeout(300);
// clicar no número da linha não abre o comentário
const nh=await p.evaluate(()=>{const e=document.querySelector('.nh');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
await p.mouse.click(nh[0],nh[1]);await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.getElementById('lc').classList.contains('hide')),'clicar no número da linha NÃO abre a caixa de comentário');
// dois cliques no número da linha: abre o comentário (de propósito)
await p.mouse.dblclick(nh[0],nh[1]);await p.waitForTimeout(500);
ok(await p.evaluate(()=>!document.getElementById('lc').classList.contains('hide')),'dois cliques no número da linha abrem o comentário');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
