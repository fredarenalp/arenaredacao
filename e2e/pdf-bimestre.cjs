// Aluno: "Salvar todas as correções do bimestre (PDF)" e correção sem foto (arquivada). Não grava nada no banco.
const { chromium } = require('playwright');
const ach=[];const ok=(m)=>console.log('ok   ',m);const falha=(m)=>{ach.push(m);console.log('FALHA',m)};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1200,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>falha('ERRO JS: '+e.message.slice(0,160)));
await p.addInitScript(()=>{window.__imprimiu=0;window.print=()=>{window.__imprimiu++}});
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=aluno]');await p.fill('#mat','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#alMain',{timeout:20000});await p.waitForTimeout(2500);
const btn=p.locator('#alPdfBim');
if(!(await btn.count()))falha('botão do bimestre não aparece');else{
  ok('botão "Salvar todas as correções do bimestre" aparece');
  await btn.click();await p.waitForTimeout(2500);
  const t=await p.evaluate(()=>({n:window.__imprimiu,txt:document.getElementById('printArea').innerText,docs:document.querySelectorAll('#printArea .pr-doc').length,pgs:document.querySelectorAll('#printArea .pr-page').length,imgs:document.querySelectorAll('#printArea img').length}));
  t.n===1?ok('abriu a impressão uma vez'):falha('impressão chamada '+t.n+' vezes');
  /Aluno Teste/.test(t.txt)?ok('nome real na capa e nas folhas'):falha('nome real ausente');
  /Lucas|Prado|2ª série A/.test(t.txt)?falha('dados fixos do protótipo no PDF'):ok('sem dados fixos do protótipo');
  /Correções do \d+º bimestre/.test(t.txt)?ok('capa com resumo do bimestre'):falha('sem capa');
  console.log('   docs',t.docs,'páginas',t.pgs,'imagens',t.imgs);
  if(t.docs<1)falha('nenhuma correção no PDF');
  if(/undefined|NaN|\[object/.test(t.txt))falha('texto ruim no PDF');
}
// correção sem foto: aviso e sem folha sintética
await p.click('.cxn').catch(()=>{});await p.waitForTimeout(1500);
const sf=await p.evaluate(()=>({aviso:!!document.querySelector('.crsf'),classe:!!document.querySelector('.cr-left.semfoto'),img:(document.getElementById('crImg')||{}).src||''}));
(await p.locator('#crPrint').count())===0?ok('dentro da redação não há botão de imprimir'):falha('ainda existe Imprimir correção dentro da redação');
console.log('   sem foto:',JSON.stringify({aviso:sf.aviso,classe:sf.classe,img:sf.img.slice(0,40)}));
await b.close();console.log(ach.length?'\nTOTAL DE FALHAS: '+ach.length:'\nTudo certo');process.exit(ach.length?1:0)})();
