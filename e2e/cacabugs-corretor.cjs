// Caça-bugs da tela do corretor (fora do AC, que tem o seu): lista de pacotes, abas, painel financeiro, lista de redações,
// tela de correção (barras, diálogos, navegação, teclado), pacote já corrigido, desktop e celular.
// Não grava nada no banco: nunca clica em Salvar, Anular, Enviar, Confirmar, Sair nem Limpar.
// Uso: node e2e/cacabugs-corretor.cjs   (preview em localhost:4173)
const { chromium } = require('playwright')
const RUIM = /undefined|NaN|\[object|Infinity|null\b/
const PERIGO = /salvar|enviar|confirmar|anular|sair|limpar|excluir|remover|apagar|aceitar|contest|liberar|zerar|resetar|reabrir|devolver|fechar pacote|finalizar|concluir|publicar|importar|substituir|trocar foto|upload|enviar foto/i
const falhas = []
const falha = (m) => { falhas.push(m); console.log('FALHA', m) }
const ok = (m) => console.log('ok   ', m)

async function rodar(b, nome, viewport) {
  const ctx = await b.newContext({ viewport, ignoreHTTPSErrors: true, hasTouch: viewport.width < 500 })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => falha(`${nome} ERRO JS: ${e.message.slice(0, 160)}`))
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) falha(`${nome} console: ${m.text().slice(0, 160)}`) })
  p.on('response', (r) => { if (/supabase\.co/.test(r.url()) && r.status() >= 400 && r.status() !== 406 && !/auth\/v1\/token/.test(r.url())) falha(`${nome} HTTP ${r.status()} ${r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 90)}`) })
  p.on('dialog', (d) => d.dismiss().catch(() => {}))
  const texto = async () => (await p.innerText('#portal').catch(() => '')).replace(/\s+/g, ' ')
  const confere = async (onde) => {
    const t = await texto()
    const m = t.match(RUIM)
    if (m) falha(`${nome} TEXTO RUIM (${onde}): …${t.slice(Math.max(0, m.index - 50), m.index + 30)}…`)
    const larg = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
    if (larg.sw > larg.iw + 2) falha(`${nome} ROLAGEM HORIZONTAL (${onde}): página com ${larg.sw}px em tela de ${larg.iw}px`)
  }
  const passo = async (rotulo, fn) => {
    try { await fn(); await confere(rotulo); ok(`${nome} ${rotulo}`) } catch (e) { falha(`${nome} ${rotulo} → ${String(e.message).split('\n')[0].slice(0, 150)}`); if (process.env.DEPURA) console.log('      tela:', (await texto()).slice(0, 300)) }
  }
  const cliqueSeguro = async (escopo, max = 30) => {
    const rotulos = await p.locator(`${escopo} button, ${escopo} [role=tab], ${escopo} summary`).evaluateAll((els) => els.filter((e) => e.offsetParent !== null && !e.disabled).map((e) => (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60))
    let n = 0
    for (const r of [...new Set(rotulos)]) {
      if (PERIGO.test(r) || n >= max) continue
      const el = p.locator(`${escopo} button, ${escopo} [role=tab], ${escopo} summary`).filter({ hasText: r }).first()
      if (!(await el.count())) continue
      await el.click({ timeout: 1500 }).catch(() => {})
      n++
      await p.waitForTimeout(250)
      await p.keyboard.press('Escape').catch(() => {})
    }
    return n
  }

  await p.goto('http://localhost:4173')
  await p.waitForTimeout(500)
  await p.click('.p[data-k=corretor]')
  await p.fill('#email', 'teste')
  await p.fill('#pwd', 'teste')
  await p.click('#entrar')
  await p.waitForSelector('#phCards', { timeout: 20000 })
  await p.waitForTimeout(1500)

  await passo('lista de pacotes: abas Abertos e Corrigidos', async () => {
    const abas = await p.locator('#portal button').filter({ hasText: /^(Abertos|Corrigidos)/ }).count()
    if (abas < 2) throw new Error('faltam as abas Abertos/Corrigidos')
    for (const r of ['Corrigidos', 'Abertos', 'Corrigidos', 'Abertos']) { await p.locator('#portal button').filter({ hasText: new RegExp('^' + r) }).first().click(); await p.waitForTimeout(300) }
  })
  await passo('painel "Quanto você recebe"', async () => {
    const t = await texto()
    if (!/QUANTO VOCÊ RECEBE/i.test(t)) throw new Error('painel financeiro não aparece')
    if (!/R\$\s?\d/.test(t)) throw new Error('painel sem valor em reais')
    const n = await cliqueSeguro('#portal', 10)
    if (n === 0) throw new Error('nenhum botão clicável na lista')
  })

  // abre cada pacote (Abertos e Corrigidos), olha a lista de redações e a tela de correção
  for (const aba of ['Abertos', 'Corrigidos']) {
    await p.locator('#portal button').filter({ hasText: new RegExp('^' + aba) }).first().click().catch(() => {})
    await p.waitForTimeout(500)
    const n = await p.locator('.pcd').count()
    if (!n) { ok(`${nome} aba ${aba}: sem pacotes (nada a abrir)`); continue }
    await passo(`aba ${aba}: abre o 1º pacote e a lista de redações`, async () => {
      await p.locator('.pcd').first().click()
      await p.waitForTimeout(900)
      const podeComecar = await p.locator('#plGo').isEnabled({ timeout: 1500 }).catch(() => false)
      if (podeComecar) await p.locator('#plGo').click()
      else await p.locator('.plrow, [data-pl], .plr').first().click() // pacote já corrigido: abre pela linha do aluno
      await p.waitForTimeout(1800)
      if (!(await p.locator('#mk').count())) throw new Error('a tela de correção (#mk) não abriu')
    })
    await passo(`aba ${aba}: nenhum botão das barras fica coberto por outro (primeira tela da correção)`, async () => {
      const cob = await p.evaluate(() => [...document.querySelectorAll('.tb button, .zbar button')].filter((b) => b.offsetParent !== null).map((b) => { const r = b.getBoundingClientRect(); if (!r.width || r.x < 0 || r.x + r.width > innerWidth) return null; const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && (e === b || b.contains(e)) ? null : (b.id || b.title || b.className).toString().slice(0, 40) }).filter(Boolean))
      if (cob.length) throw new Error('botões cobertos: ' + cob.join(', '))
    })
    await passo(`aba ${aba}: zoom, girar, ajustar`, async () => {
      for (const id of ['#zp', '#zp', '#zm', '#zm']) { await p.click(id, { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150) }
      await p.keyboard.press('Escape').catch(() => {})
    })
    await passo(`aba ${aba}: níveis 0 a 4 nos 5 critérios (sem salvar)`, async () => {
      if (viewport.width < 700) { const g = p.locator('text=Níveis e comentários').first(); if (await g.count()) { await g.click(); await p.waitForTimeout(500) } } // no celular os níveis ficam numa gaveta
      for (let k = 0; k < 5; k++) for (const nv of [0, 1, 2, 3, 4]) {
        const bt = p.locator('.rc .lv').nth(k).locator(`button[data-n="${nv}"]`)
        try { await bt.click({ timeout: 2500 }) } catch (e) {
          const info = await bt.evaluate((el) => { const r = el.getBoundingClientRect(); const x = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { disabled: el.disabled, rect: [r.x, r.y, r.width, r.height].map(Math.round), topo: x ? x.tagName + '#' + x.id + '.' + String(x.className).slice(0, 40) + ' «' + (x.innerText || '').slice(0, 40).replace(/\s+/g, ' ') + '»' : null } }).catch(() => ({ erro: 'sem elemento' }))
          throw new Error(`critério ${k + 1}, nível ${nv}: ` + JSON.stringify(info))
        }
      }
    })
    await passo(`aba ${aba}: Guia e (i) de cada critério`, async () => {
      const gs = p.locator('.rc [class*=guia], .rc button:has-text("Guia")')
      const g = await gs.count()
      for (let i = 0; i < Math.min(g, 5); i++) { await gs.nth(i).click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(250); await p.keyboard.press('Escape') }
    })
    await passo(`aba ${aba}: atalhos de teclado (1 a 6, setas, Esc, ?)`, async () => {
      for (const k of ['1', '2', '3', '4', '5', '6', 'ArrowRight', 'ArrowLeft', '?', 'Escape', 'o', 'Escape']) { await p.keyboard.press(k).catch(() => {}); await p.waitForTimeout(120) }
    })
    await passo(`aba ${aba}: tela de correção, botões das barras`, async () => {
      const n2 = await cliqueSeguro('.tb, #zbar, #fm', 40)
      console.log(`      (${n2} botões clicados)`)
    })
    await passo(`aba ${aba}: voltar para a lista de redações e para Meus pacotes`, async () => {
      await p.locator('a, button').filter({ hasText: /Lista do pacote/ }).first().click({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(600)
      await p.locator('a, button').filter({ hasText: /Meus pacotes/ }).first().click({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(800)
      if (!(await p.locator('#phCards').count())) throw new Error('não voltou para a lista de pacotes')
    })
  }
  await ctx.close()
}

;(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } })
  await rodar(b, 'desktop', { width: 1366, height: 900 })
  await rodar(b, 'celular', { width: 390, height: 800 })
  await b.close()
  console.log(falhas.length ? `\nTOTAL DE FALHAS (corretor): ${falhas.length}\n - ` + falhas.join('\n - ') : '\nTOTAL DE FALHAS (corretor): 0')
  process.exit(falhas.length ? 1 : 0)
})()
