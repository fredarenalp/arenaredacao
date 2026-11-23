// Correção no celular (390 px): barra I a V, gaveta com nível e categorias, círculo padrão arrastado pela alça com toque real,
// Pronto / + outro / cancelar, todas as categorias. Não grava no banco (nunca clica em Salvar).
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true});
const p=await ctx.newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon/.test(m.text())){console.log('console',m.text().slice(0,120));falhas++}});
p.on('dialog',d=>d.dismiss().catch(()=>{}));
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(1200);
await p.locator('.pcd').first().click();await p.waitForTimeout(800);await p.locator('#plGo').click();await p.waitForTimeout(2000);
const n=(s)=>p.locator(s).count();
const marcas=()=>p.evaluate(()=>document.querySelectorAll('#mk g.xm:not(.pv)').length);
const vis=(s)=>p.locator(s).isVisible().catch(()=>false);
ok(await vis('#mBar')&&await n('#mBar .mchip')===5,'barra com os 5 critérios I a V');
ok(await vis('#mSalvar'),'botão Salvar na barra');
ok(!(await vis('.fm .fa')),'os botões grandes Anular/IA/Salvar antigos saíram da tela');
ok((await p.locator('#pbTog').innerText()).includes('Níveis e comentários'),'a linha "Níveis e comentários" continua');
const antes=await marcas();
// nível pela gaveta
await p.locator('.mchip').nth(1).click();await p.waitForTimeout(300);
ok(await vis('#mDr .mcats')&&await n('#mDr .mcat:not(.ex)')===11,'II abre a gaveta com as 11 categorias de Linguagem');
await p.locator('#mDr [data-mn="3"]').click();await p.waitForTimeout(300);
ok((await p.locator('.mchip').nth(1).innerText()).includes('nível 3'),'escolher o nível 3 aparece no chip II');
ok(await p.evaluate(()=>{const l=document.querySelectorAll('#comps .lv')[1];return !!l&&!!l.querySelector('button.on,button[aria-pressed=true],button.sel')}),'e vale também no painel de níveis (mesmo dado)');
await p.screenshot({path:'/tmp/claude-0/-home-user/8b0ef16d-a90f-56a1-a546-1333957514b8/scratchpad/caca/mc_1.png'});
// categoria simples: Rasura (critério I) com arrasto por toque real
await p.locator('.mchip').nth(0).click();await p.waitForTimeout(300);
await p.locator('#mDr [data-md="ra"]').click();await p.waitForTimeout(400);
ok(await vis('#mDr .mslim')&&await n('#mk .mghost')===1&&await n('#mGrip')===1,'escolher a categoria troca a gaveta pela faixa fina e mostra o círculo com alça');
const pos=()=>p.evaluate(()=>{const e=document.getElementById('mgE');return [+e.getAttribute('cx'),+e.getAttribute('cy')]});
const p0=await pos();
const g=await p.evaluate(()=>{const r=document.getElementById('mGrip').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
const cdp=await ctx.newCDPSession(p);
const toque=async(tipo,x,y)=>cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:tipo==='touchEnd'?[]:[{x,y,id:1}]});
await toque('touchStart',g[0],g[1]);for(let k=1;k<=8;k++)await toque('touchMove',g[0]-k*6,g[1]+k*4);await toque('touchEnd');await p.waitForTimeout(300);
const p1=await pos();
ok(Math.abs(p1[0]-p0[0])>8||Math.abs(p1[1]-p0[1])>5,'arrastar a alça com o dedo move o círculo ('+p0.map(Math.round)+' → '+p1.map(Math.round)+')');
ok(await n('#mGrip')===1,'a alça continua na tela depois do arrasto');
await p.click('#mMais');await p.waitForTimeout(200);
const rx=await p.evaluate(()=>+document.getElementById('mgE').getAttribute('rx'));
ok(rx>9,'o botão + aumenta o círculo (rx '+rx+')');
await p.click('#mOutro');await p.waitForTimeout(500);
ok(await marcas()===antes+1&&await n('#mGrip')===1&&!(await vis('#catp')),'+ outro fixa a marca (Rasura) e já solta a próxima');
await p.click('#mPronto');await p.waitForTimeout(500);
ok(await marcas()===antes+2,'Pronto fixa a segunda marca');
ok((await p.locator('.mchip').nth(0).innerText()).includes('2'),'o chip I mostra 2 marcas');
// cancelar
await p.locator('.mchip').nth(0).click();await p.waitForTimeout(250);await p.locator('#mDr [data-md="mr"]').click();await p.waitForTimeout(300);
ok(await n('#mk .mgl')===1,'Linha curta mostra o fantasma como linha reta');
await p.click('#mCancela');await p.waitForTimeout(300);
ok(await marcas()===antes+2&&await n('#mk .mghost')===0,'× cancela sem criar marca');
// todas as categorias: Pronto cria a marca e o AC continua para o que precisa de pergunta
const lista=[[0,['ti','ra','mr','ma','pc','pe','pd']],[1,['ac','pt','or','ss','il','mi','cj','cn','rg','ol','pr']],[2,['rp','ce','ca']],[3,['ele','eli']],[4,['lac']]];
for(const [k,ids] of lista)for(const id of ids){
  const a0=await marcas();
  for(let r=0;r<2;r++){await p.keyboard.press('Escape');await p.waitForTimeout(120)}
  await p.evaluate(()=>{['catp','catpS'].forEach(i=>{const c=document.getElementById(i);if(c)c.classList.add('hide')})});
  const bt=p.locator('#mDr [data-md="'+id+'"]');
  for(let r=0;r<2&&!(await bt.count());r++){await p.locator('.mchip').nth(k).click({timeout:3000,force:true}).catch(()=>{});await p.waitForTimeout(250)}
  if(!(await bt.count())){ok(false,'categoria '+id+': botão não existe na gaveta');continue}
  await bt.click();await p.waitForTimeout(250);
  const faixa=await vis('#mDr .mslim');
  await p.click('#mPronto',{timeout:3000}).catch(()=>{});await p.waitForTimeout(450);
  const a1=await marcas();
  const rotulo=await p.evaluate(()=>{const g=[...document.querySelectorAll('#mk g.xm:not(.pv)')].pop();const t=g&&g.querySelector('text.cl');return t?t.textContent:''});
  ok(faixa&&a1===a0+1,'categoria '+id+': faixa fina, Pronto cria a marca'+(rotulo?' ('+rotulo+')':''));
}
// menu ⋯
await p.keyboard.press('Escape');await p.evaluate(()=>{const c=document.getElementById('catp');if(c)c.classList.add('hide')});
await p.click('#mMore');await p.waitForTimeout(250);
ok(await vis('#mMenu')&&(await p.locator('#mMenu button').count())===5,'menu ⋯ com 5 opções');
await p.locator('#mMenu [data-mm="an"]').click();await p.waitForTimeout(400);
ok(await vis('#ma'),'Anular redação abre a janela de anulação (sem anular)');
await p.keyboard.press('Escape');await p.waitForTimeout(200);
const larg=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));
ok(larg.sw<=larg.iw+2,'sem rolagem horizontal');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
