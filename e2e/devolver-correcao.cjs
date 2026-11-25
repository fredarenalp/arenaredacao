// Coordenação: ver as correções de um pacote antes de liberar e DEVOLVER uma redação ao corretor; o corretor vê o recado.
// Grava no banco de teste (marca extras.devolvida na correção da redação do 1º pacote) e DESFAZ no fim (UPDATE via API, como coordenação).
// Uso: node e2e/devolver-correcao.cjs   (preview em localhost:4173)
const { chromium } = require('playwright')
const falhas = []
const ok = (c, m) => { if (c) console.log('ok   ', m); else { falhas.push(m); console.log('FALHA', m) } }
;(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } })
  const novaPagina = async () => (await b.newContext({ viewport: { width: 1366, height: 800 }, ignoreHTTPSErrors: true })).newPage()
  const erros = []
  const c = await novaPagina(); c.on('pageerror', (e) => erros.push(e.message))
  await c.goto('http://localhost:4173'); await c.waitForTimeout(400)
  await c.click('#restrBtn'); await c.fill('#email', 'teste@arena.com'); await c.fill('#pwd', 'teste'); await c.click('#entrar')
  await c.waitForSelector('body.in-coord', { timeout: 25000 }); await c.waitForTimeout(1500)
  await c.locator('#coBar [data-top="corretores"]').click(); await c.waitForTimeout(800)
  ok(await c.locator('[data-x-vercorr]').count() > 0, 'Pacotes: botão "Ver correções" nas linhas com correção salva')
  ok(await c.locator('[data-x-devpac]').count() > 0, 'Pacotes: botão "Devolver pacote" ao lado de "Liberar pacote"')
  await c.locator('[data-x-vercorr]').first().click(); await c.waitForSelector('.pcvr', { timeout: 10000 })
  ok(await c.locator('.pcvr .pcvc').count() >= 5, 'a lista mostra aluno, níveis I–V e situação de cada redação')
  await c.locator('[data-pcv]').first().click(); await c.waitForSelector('#pvw img', { timeout: 10000 })
  ok(await c.evaluate(() => !!document.querySelector('#pvw img').src && document.querySelectorAll('#pvw svg').length > 0), '"Ver correção" abre a folha com a foto e as marcações do corretor')
  await c.click('#pvX'); await c.waitForTimeout(300)
  // devolver uma redação
  await c.locator('[data-pcvd]').first().click(); await c.waitForSelector('#dvmT')
  ok(await c.locator('#dvm [data-c="y"]').isDisabled(), 'Devolver exige escrever o que falta corrigir')
  await c.fill('#dvmT', 'TESTE: faltou marcar a ortografia da linha 3.'); await c.locator('#dvm [data-c="y"]').click(); await c.waitForTimeout(1500)
  // o corretor vê
  const k = await novaPagina(); k.on('pageerror', (e) => erros.push(e.message))
  await k.goto('http://localhost:4173'); await k.waitForTimeout(400)
  await k.click('.p[data-k=corretor]'); await k.fill('#email', 'teste'); await k.fill('#pwd', 'teste'); await k.click('#entrar')
  await k.waitForSelector('#phCards', { timeout: 20000 }); await k.waitForTimeout(1200)
  const cards = await k.locator('.pcd').count()
  ok(await k.locator('.pcd .pkcN').count() > 0 && /Devolvido pela coordenação/.test(await k.locator('.pcd .pkcN').first().innerText()), 'o card do pacote, na tela inicial do corretor, mostra "Devolvido pela coordenação" com o recado')
  let achou = false
  for (let i = 0; i < cards && !achou; i++) {
    await k.locator('.pcd').nth(i).click(); await k.waitForTimeout(700)
    if (await k.locator('.pltg:has-text("Devolvida pela coordenação")').count()) { achou = true; break }
    await k.locator('a, button').filter({ hasText: /Meus pacotes/ }).first().click(); await k.waitForTimeout(600)
  }
  ok(achou, 'o corretor vê "Devolvida pela coordenação" na lista de redações do pacote')
  if (achou) {
    await k.locator('.plr:has(.pltg:has-text("Devolvida"))').first().click(); await k.waitForSelector('#mk'); await k.waitForTimeout(1200)
    ok(await k.locator('#devolBar').isVisible() && /ortografia da linha 3/.test(await k.locator('#devolTxt').innerText()), 'na correção aparece o recado da coordenação')
  }
  ok(erros.length === 0, 'sem erros de JavaScript' + (erros.length ? ': ' + erros[0] : ''))
  // desfaz a devolução (limpa extras.devolvida) usando a sessão da coordenação
  // nova sessão da coordenação (os dados são recarregados do banco)
  const c2 = await novaPagina(); c2.on('pageerror', (e) => erros.push(e.message))
  await c2.goto('http://localhost:4173'); await c2.waitForTimeout(400)
  await c2.click('#restrBtn'); await c2.fill('#email', 'teste@arena.com'); await c2.fill('#pwd', 'teste'); await c2.click('#entrar')
  await c2.waitForSelector('body.in-coord', { timeout: 25000 }); await c2.waitForTimeout(1500)
  await c2.locator('#coBar [data-top="corretores"]').click(); await c2.waitForTimeout(800)
  await c2.locator('[data-x-vercorr]').first().click(); await c2.waitForSelector('.pcvr', { timeout: 10000 })
  ok(await c2.locator('.pcvr:has-text("Devolvida ao corretor")').count() > 0, 'a coordenação vê a redação como "Devolvida ao corretor"')
  await c2.locator('[data-pcvc]').first().click(); await c2.waitForTimeout(1500)
  await c2.locator('#coBar [data-top="corretores"]').click().catch(() => {}); await c2.waitForTimeout(600)
  await c2.locator('[data-x-vercorr]').first().click(); await c2.waitForSelector('.pcvr', { timeout: 10000 })
  ok(await c2.locator('.pcvr:has-text("Devolvida ao corretor")').count() === 0, 'Cancelar devolução desfaz (e deixa o banco de teste como estava)')
  await b.close()
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo')
  process.exit(falhas.length ? 1 : 0)
})()
