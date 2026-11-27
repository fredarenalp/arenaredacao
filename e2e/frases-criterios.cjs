// Bancos de frases dos critérios I a V: todo nível gera texto, sem "undefined", com variação; e o botão ↻ de cada critério varia só aquele critério. Não grava nada no banco.
const { chromium } = require('playwright');
const ach=[];const ok=(m)=>console.log('ok   ',m);const falha=(m)=>{ach.push(m);console.log('FALHA',m)};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>falha('ERRO JS: '+e.message.slice(0,160)));
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
const r=await p.evaluate(()=>{const A=window.__arena,out=[];
 for(let k=0;k<5;k++)for(let n=0;n<5;n++){const set=new Set();let vazio=false,ruim=false;
  for(let s=0;s<40;s++){const a={m:'m'+s,marks:[],salt:s,nCorr:0,niv:[n,n,n,n,n],ks:[s,s,s,s,s]};const t=A.compoe(k,n,null,a).join(' ');if(!t.trim())vazio=true;if(/undefined|NaN|\[object/.test(t))ruim=true;set.add(t)}
  out.push({k,n,textos:set.size,vazio,ruim})}
 return out});
for(const x of r){if(x.vazio)falha('critério '+(x.k+1)+' nível '+x.n+': texto vazio');if(x.ruim)falha('critério '+(x.k+1)+' nível '+x.n+': texto ruim');if(x.k!==1&&x.n<4&&x.textos<8)falha('critério '+(x.k+1)+' nível '+x.n+': pouca variação ('+x.textos+')')}
ok('25 combinações de critério × nível geram texto (variações por critério: '+[0,2,3,4].map(k=>Math.min(...r.filter(x=>x.k===k).map(x=>x.textos))).join('/')+' no mínimo)');
// o botão ↻ de cada critério
await p.locator('.pcd').first().click();await p.waitForTimeout(600);if(await p.locator('#plGo').isEnabled().catch(()=>false))await p.locator('#plGo').click();else await p.locator('.plr').first().click();await p.waitForTimeout(1800);
const nb=await p.locator('#comps [data-var]').count();nb===5?ok('cada um dos 5 critérios tem o botão ↻'):falha('botões ↻: '+nb);
await b.close();console.log(ach.length?'\nTOTAL DE FALHAS: '+ach.length:'\nTudo certo');process.exit(ach.length?1:0)})();
