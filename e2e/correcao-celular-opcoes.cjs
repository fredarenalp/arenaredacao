// Celular (390x800): categorias com opções abrem direto na gaveta; a alça move a marca real enquanto isso; as opções concluem (repetição, elemento, comentário, ortografia). Não grava no banco.
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true});
const p=await ctx.newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
const entra=async()=>{await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
 await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(1000);
 await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('arena_rasc_')).forEach(k=>localStorage.removeItem(k))); // sem rascunho de passos anteriores
 await p.locator('.pcd').first().click();await p.waitForTimeout(700);await p.locator('#plGo').click();await p.waitForTimeout(1800)};
const abre=async(k,id)=>{for(let r=0;r<2&&!(await p.locator('#mDr [data-md="'+id+'"]').count());r++){await p.locator('.mchip').nth(k).click({force:true});await p.waitForTimeout(300)}await p.locator('#mDr [data-md="'+id+'"]').click();await p.waitForTimeout(900)};
const marcas=()=>p.evaluate(()=>document.querySelectorAll('#mk g.xm:not(.pv)').length);
const aberto=()=>p.evaluate(()=>['catp','catpS','lc'].some(i=>!document.getElementById(i).classList.contains('hide')));
const cdp=await ctx.newCDPSession(p);
const toque=async(tipo,x,y)=>cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:tipo==='touchEnd'?[]:[{x,y,id:1}]});

// 1) a alça move a marca REAL com a gaveta aberta (e a gaveta não fecha)
await entra();await abre(2,'rp');
const pos=()=>p.evaluate(()=>{const g=[...document.querySelectorAll('#mk g.xm:not(.pv)')].pop();const e=g.querySelector('ellipse');return [+e.getAttribute('cx'),+e.getAttribute('cy')]});
const p0=await pos();
const g=await p.evaluate(()=>{const r=document.getElementById('mGrip').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
await toque('touchStart',g[0],g[1]);for(let k=1;k<=8;k++)await toque('touchMove',g[0]-k*7,g[1]+k*3);await toque('touchEnd');await p.waitForTimeout(400);
const p1=await pos();
ok(Math.abs(p1[0]-p0[0])>8,'repetição: arrastar a alça move a marca real ('+p0.map(Math.round)+' → '+p1.map(Math.round)+')');
ok(await aberto(),'a gaveta de opções continua aberta depois de mover a marca');
// zoom não fecha as opções
await p.click('#zp');await p.waitForTimeout(300);
ok(await aberto(),'dar zoom na folha não fecha as opções');
// 2) repetição: digitar a palavra e OK
await p.fill('#rpW','mais');await p.click('#catp .rpok');await p.waitForTimeout(600);
ok(!(await aberto())&&await marcas()===1,'repetição: OK fecha a gaveta e a marca fica');
// 3) elemento ausente: escolher o elemento
await entra();await abre(3,'ele');
ok(await p.locator('#catp .elp button').count()>0,'elemento: a lista de elementos aparece na gaveta');
await p.locator('#catp .elp button').first().click();await p.waitForTimeout(700);
ok(await marcas()===1,'elemento: escolher um elemento mantém a marca');
// 4) comentar: escrever e salvar
await entra();await abre(0,'cmt');
ok(await p.evaluate(()=>!document.getElementById('lc').classList.contains('hide')),'comentar: a caixa do comentário abre na gaveta');
await p.fill('#lcT','Explique melhor este trecho.');await p.click('#lcok');await p.waitForTimeout(700);
ok(!(await aberto()),'comentar: salvar fecha a gaveta');
// 5) cancelar remove a marca; fechar sem concluir também descarta
await entra();await abre(1,'or');
ok(await marcas()===1,'ortografia: a marca nasce na hora');
await p.locator('.mchip').nth(0).click({force:true});await p.waitForTimeout(500);
ok(await marcas()===0,'tocar em outro critério sem concluir descarta a marca sem categoria');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
