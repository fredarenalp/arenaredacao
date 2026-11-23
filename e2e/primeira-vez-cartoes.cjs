// Aluno: a 1ª vez que abre uma correção ainda não vista abre a análise em cartões; nas próximas, a tela normal.
// Precisa de uma correção liberada e ainda não vista (vista_em vazio) para o aluno teste; ao final ela fica "vista".
const { chromium } = require('playwright');
let falhas=0;const ok=(c,m)=>{console.log(c?'ok   ':'FALHA',m);if(!c)falhas++};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1280,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>{console.log('ERRO JS',e.message.slice(0,150));falhas++});
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=aluno]');await p.fill('#mat','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#alMain',{timeout:20000});await p.waitForTimeout(2500);
const cartoes=()=>p.evaluate(()=>{const e=document.getElementById('alIntro');return !!e&&!e.classList.contains('hide')});
const nova=await p.locator('.cxnova').count();
ok(nova>0,'há uma correção marcada como "Nova" (ainda não vista)');
ok(!(await cartoes()),'ao entrar, os cartões não abrem sozinhos');
await p.click('.cxn');await p.waitForTimeout(1500);
ok(await cartoes(),'1ª vez em "Ver correção": abre a análise em cartões');
await p.keyboard.press('Escape');await p.waitForTimeout(500);
if(await cartoes()){const x=p.locator('#alIntro [aria-label*="echar"], #alIntro .ai-x, #alIntro button:has-text("Pular")').first();await x.click().catch(()=>{});await p.waitForTimeout(500)}
ok(!(await cartoes())&&await p.locator('#crPg, .cr-grid').count()>0,'ao fechar os cartões, aparece a correção normal');
await p.click('#alVolta');await p.waitForTimeout(800);
await p.click('.cxn');await p.waitForTimeout(1500);
ok(!(await cartoes())&&await p.locator('.cr-grid').count()>0,'2ª vez: abre direto a correção normal, sem cartões');
await b.close();console.log(falhas?'\n'+falhas+' falha(s)':'\nTudo certo');process.exit(falhas?1:0)})()
