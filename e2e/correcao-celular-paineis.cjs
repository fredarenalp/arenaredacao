// Celular (390x700): as perguntas seguintes de Conectivo e Ortografia aparecem numa folha embaixo, dentro da tela, e funcionam. Não grava no banco.
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:390,height:700},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
const entra=async()=>{await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
 await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(1000);await p.locator('.pcd').first().click();await p.waitForTimeout(700);await p.locator('#plGo').click();await p.waitForTimeout(1800)};
const dentro=(s)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {visivel:cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0,dentro:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1,rect:[r.x,r.y,r.width,r.height].map(Math.round)}},s);
const cria=async(k,id)=>{for(let r=0;r<2&&!(await p.locator('#mDr [data-md="'+id+'"]').count());r++){await p.locator('.mchip').nth(k).click({force:true});await p.waitForTimeout(300)}
 await p.locator('#mDr [data-md="'+id+'"]').click();await p.waitForTimeout(300);await p.click('#mPronto');await p.waitForTimeout(800)};
// --- conectivo errado: Corrigir
await entra();await cria(2,'ce');
let s1=await dentro('#catpS');ok(s1&&s1.visivel&&s1.dentro,'conectivo: a folha "Só marcar / Corrigir" aparece dentro da tela '+JSON.stringify(s1&&s1.rect));
ok((await dentro('#catp')).visivel===false,'o AC inteiro fica escondido atrás da folha');
await p.click('[data-cnstart]');await p.waitForTimeout(1500);
s1=await dentro('#catpS');ok(s1&&s1.visivel&&s1.dentro,'conectivo: depois de Corrigir, a folha com a função e os conectivos cabe na tela '+JSON.stringify(s1&&s1.rect));
const nCnt=await p.locator('#catpS .cnt').count();ok(nCnt>0,'conectivo: há conectivos para escolher ('+nCnt+')');
if(nCnt){await p.locator('#catpS .cnt').first().tap().catch(()=>p.locator('#catpS .cnt').first().click());await p.waitForTimeout(400);}
const okb=p.locator('#catpS [data-cnok]');if(await okb.count()){await okb.first().scrollIntoViewIfNeeded();await okb.first().click();await p.waitForTimeout(600)}
ok((await dentro('#catpS'))?.visivel!==true,'conectivo: confirmar fecha a folha');
// --- ortografia: palavra correta
await entra();await cria(1,'or');
let s2=await dentro('#catpS');ok(s2&&s2.visivel&&s2.dentro,'ortografia: a folha com "Palavra correta" aparece dentro da tela '+JSON.stringify(s2&&s2.rect));
await p.fill('#orW','excessão');await p.waitForTimeout(500);
await p.click('#catpS [data-ortok="1"]');await p.waitForTimeout(600);
ok((await dentro('#catpS'))?.visivel!==true,'ortografia: Corrigir fecha a folha');
const rot=await p.evaluate(()=>{const g=[...document.querySelectorAll('#mk g.xm:not(.pv)')].pop();const t=g&&g.querySelector('text.cl');return t?t.textContent:''});
ok(/exce/i.test(rot),'a marca mostra a palavra correta ('+rot+')');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
