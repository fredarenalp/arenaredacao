const { chromium } = require('playwright');
const RUIM=/undefined|NaN|\[object|Infinity|null\b/;
const ach=[];const ok=(m)=>console.log('ok   ',m);const falha=(m)=>{ach.push(m);console.log('FALHA',m)};
(async()=>{const b=await chromium.launch({proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}});
const p=await (await b.newContext({viewport:{width:1366,height:900},ignoreHTTPSErrors:true})).newPage();
p.on('pageerror',e=>falha('ERRO JS: '+e.message.slice(0,160)));
p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon/.test(m.text()))falha('console: '+m.text().slice(0,160))});
p.on('response',r=>{if(/supabase\.co/.test(r.url())&&r.status()>=400&&r.status()!==406&&!/auth\/v1\/token/.test(r.url()))falha('HTTP '+r.status()+' '+r.url().replace(/^https:\/\/[^/]+/,'').slice(0,90))});
p.on('dialog',d=>d.accept());
const T=async(s)=>{try{return (await p.innerText(s)).replace(/\s+/g,' ')}catch{return ''}};
const cnt=async(s)=>await p.locator(s).count();
const txtRuim=async(onde)=>{const t=await T('#portal');const m=t.match(RUIM);if(m)falha('TEXTO RUIM ('+onde+'): …'+t.slice(Math.max(0,m.index-50),m.index+30)+'…')};
await p.goto('http://localhost:4173');await p.waitForTimeout(500);await p.click('.p[data-k=corretor]');await p.fill('#email','teste');await p.fill('#pwd','teste');await p.click('#entrar');
await p.waitForSelector('#phCards',{timeout:20000});await p.waitForTimeout(800);
const cards=await p.locator('.pcd').allInnerTexts();const idx=cards.findIndex(t=>/1ª versão ·/.test(t));await p.locator('.pcd').nth(Math.max(idx,0)).click();await p.waitForTimeout(600);
await p.locator('#plGo').click();await p.waitForTimeout(2000);await p.mouse.click(158,136);await p.waitForTimeout(300);
let Y=250;
const marca=async(w=46,h=18)=>{Y+=45;if(Y>780)Y=290;const x=380+((Y*7)%140);await p.mouse.move(x,Y);await p.mouse.down();await p.mouse.move(x+w/2,Y+h/2,{steps:4});await p.mouse.move(x+w,Y+h,{steps:4});await p.mouse.up();await p.waitForTimeout(350);return {x,Y}};
const fecha=async()=>{await p.keyboard.press('Escape').catch(()=>{});await p.mouse.click(640,70);await p.waitForTimeout(200)};
const passo=async(nome,fn)=>{try{await fn();await txtRuim(nome);ok(nome)}catch(e){falha(nome+' → '+String(e.message).split('\n')[0].slice(0,140))}await fecha();};
const mc=async()=>parseInt((await T('#mkc')))||0;

// 1) cada categoria direta do AC
for(const c of ['ac','pt','il','mi','ss','ra','mr','ma','rp','ce','ca'])await passo('categoria '+c,async()=>{await marca();
  const sel='#catp button[data-cat="'+c+'"]';
  const tog={ss:'out',il:'out',mi:'out',rg:'verbo',cn:'verbo',cj:'verbo',ol:'voc',pr:'voc'}[c];
  if(tog){await p.click('#catp [data-sidetog="'+tog+'"]');await p.waitForTimeout(250);await p.click('#catpS button[data-cat="'+c+'"]')}else await p.click(sel);
  await p.waitForTimeout(250)});
for(const c of ['rg','cn','cj','ol','pr'])await passo('painel '+c,async()=>{await marca();const tog={rg:'verbo',cn:'verbo',cj:'verbo',ol:'voc',pr:'voc'}[c];await p.click('#catp [data-sidetog="'+tog+'"]');await p.waitForTimeout(250);await p.click('#catpS button[data-cat="'+c+'"]');await p.waitForTimeout(300);if(c==='pr'||c==='rp'){await p.fill('#rpW','coisa').catch(()=>{});await p.waitForTimeout(500)}});
// 2) ortografia: corrigir e só marcar
await passo('ortografia corrigir',async()=>{await marca();await p.click('#catp [data-sidetog="ort"]');await p.waitForTimeout(300);await p.fill('#orW','excessão');await p.waitForTimeout(500);await p.click('#catpS [data-ortok="1"]');await p.waitForTimeout(300)});
await passo('ortografia só marcar',async()=>{await marca();await p.click('#catp [data-sidetog="ort"]');await p.waitForTimeout(300);await p.click('#catpS [data-ortok="0"]');await p.waitForTimeout(300)});
// 3) título
for(const [t,c] of [['aus',null],['ins',true],['ins',false]])await passo('título '+t+(c===null?'':c?' cópia':' sem cópia'),async()=>{await marca();await p.click('#catp [data-sidetog="tit"]');await p.waitForTimeout(300);await p.click('#catpS [data-ti="'+t+'"]');await p.waitForTimeout(300);if(c!==null){await p.click('#catpS [data-tc="'+(c?1:0)+'"]');await p.waitForTimeout(300)}});
// 4) conectivos
await passo('conectivo errado corrigir',async()=>{await marca();await p.click('#catp button[data-cat="ce"]');await p.waitForTimeout(300);await p.click('[data-cnstart]');await p.waitForTimeout(700);await p.type('#cnW','porém',{delay:30});await p.waitForTimeout(300);await p.click('.cnt >> nth=0');await p.click('[data-cnok]');await p.waitForTimeout(400)});
await passo('conectivo ausente corrigir',async()=>{await marca();await p.click('#catp button[data-cat="ca"]');await p.waitForTimeout(300);await p.click('[data-cnstart]');await p.waitForTimeout(700);await p.click('.cnselb');await p.click('.cndd button >> nth=1');await p.click('.cnt >> nth=0');await p.click('.cnt >> nth=1');await p.click('.cnt >> nth=2');await p.click('.cnt >> nth=2');await p.click('[data-cnok]');await p.waitForTimeout(400)});
await passo('conectivo "mais funções" e "ver mais"',async()=>{await marca();await p.click('#catp button[data-cat="ca"]');await p.waitForTimeout(300);await p.click('[data-cnstart]');await p.waitForTimeout(700);await p.click('.cnselb');await p.click('[data-cnall]');await p.waitForTimeout(200);await p.click('.cndd button[data-cnf="fala"]');await p.click('[data-cnmais]');await p.waitForTimeout(200);await p.click('.cnt >> nth=5');await p.click('[data-cnx]')});
// 5) parágrafo, linha, elogio, comentar, elemento, lacuna
await passo('parágrafos 1..4',async()=>{await marca();for(const n of [1,2,3,4]){await p.click('#catp button[data-par="'+n+'"]').catch(()=>{});await p.waitForTimeout(150)}});
await passo('ajuste de linha +/-',async()=>{await marca();await p.click('#catp button[data-ln="1"]');await p.click('#catp button[data-ln="-1"]');await p.click('#catp button[data-ln="-1"]')});
await passo('elogio',async()=>{await marca();await p.click('#catp button[data-cat="el"]');await p.waitForTimeout(400)});
await passo('comentar',async()=>{await marca();await p.click('#catp button[data-cat="cmt"]');await p.waitForTimeout(400);await p.keyboard.type('Comentário de teste',{delay:5}).catch(()=>{})});
await passo('elemento do gênero',async()=>{await marca();await p.click('#catp [data-sidetog="ele"]');await p.waitForTimeout(300);await p.click('#catpS button[data-cat="ele"]');await p.waitForTimeout(400);await p.keyboard.press('1')});
await passo('lacuna',async()=>{await marca();await p.click('#catp button[data-cat="lac"]');await p.waitForTimeout(500)});
await passo('remover marca',async()=>{await marca();await p.click('#catp button[data-cat="rm"]');await p.waitForTimeout(300)});
// 6) símbolos de ausência
for(const s of ['.',',',':','´','`','^','~','ç'])await passo('símbolo '+s,async()=>{await marca();await p.click('#catp button[data-sym="'+s+'"]');await p.waitForTimeout(250)});
// 7) atalhos de teclado
for(const k of ['1','2','3','5','6','r','m','a','u','p'])await passo('atalho '+k,async()=>{await marca();await p.keyboard.press(k);await p.waitForTimeout(250)});
// 8) desfazer / refazer
await passo('desfazer ×15',async()=>{for(let i=0;i<15;i++){await p.keyboard.press('Control+z');await p.waitForTimeout(80)}});
await passo('refazer ×15',async()=>{for(let i=0;i<15;i++){await p.keyboard.press('Control+y');await p.waitForTimeout(80)}});
console.log('marcas ao final:',await mc());
// 9) níveis e comentários
await passo('níveis 0-4 em todos os critérios',async()=>{for(let k=0;k<5;k++){for(const n of [0,1,2,3,4]){const l=p.locator('.rc .lv').nth(k).locator('button[data-n="'+n+'"]');try{await l.click({timeout:2500})}catch(e){const cob=await p.evaluate(()=>{const e=document.elementFromPoint(0,0);return ''});const box=await l.boundingBox();const el=box?await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);if(!e)return '?';const ch=[];let n=e;while(n&&ch.length<6){ch.push((n.id?'#'+n.id:'')+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ').join('.'):''));n=n.parentElement}return ch.join(' < ')},[box.x+box.width/2,box.y+box.height/2]):'sem caixa';throw new Error('critério '+k+' nível '+n+' coberto por: '+el)}await p.waitForTimeout(60)}}});
const al=await T('#portal');console.log('alertas de incoerência na tela:',(al.match(/Conferência da correção[^]*?(?=Observações)/)||[''])[0].slice(0,300));
await passo('limpar correção e refazer 1 marca',async()=>{await p.click('#mkClear');await p.waitForTimeout(300);await p.click('#lmpOk').catch(()=>{});await p.waitForTimeout(500)});
console.log('\nTOTAL DE FALHAS:',ach.length);ach.forEach(a=>console.log(' -',a));
await b.close()})()
