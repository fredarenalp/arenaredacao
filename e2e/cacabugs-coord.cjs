// Caça-bugs da coordenação e do professor: percorre todas as abas, clica em controles seguros (filtros, abas, busca, seletores)
// e confere erros de página/console/servidor e textos como "undefined". Não grava nada (evita botões de ação).
const { chromium } = require('playwright')
const RUIM = /undefined|NaN|\[object|Infinity/
const ach = []
const ok = (m) => console.log('ok   ', m)
const falha = (m) => { ach.push(m); console.log('FALHA', m) }
const PERIGO = /excluir|remover|apagar|encerrar|liberar|salvar|criar|gerar|enviar|aceitar|recusar|anular|resetar|redefinir|sair|zerar|limpar|confirmar|iniciar|marcar como|agendar|reabrir|restaurar|importar|substituir|publicar|finalizar|atualizar|trocar|aplicar|desativar|ativar|pausar|reativar|backup|restore|\bnovo\b|nova |adicionar|\+|×|✕|tudo|aprovar|decidir|combinar|atendido|ocultar|retirar|devolver/i

async function percorre(nome, abrir, entrada) {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } })
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true })).newPage()
  p.on('pageerror', (e) => falha(nome + ' ERRO JS: ' + e.message.slice(0, 160)))
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) falha(nome + ' console: ' + m.text().slice(0, 140)) })
  p.on('response', (r) => { if (/supabase\.co/.test(r.url()) && r.status() >= 400 && r.status() !== 406 && !/auth\/v1\/token/.test(r.url())) falha(nome + ' HTTP ' + r.status() + ' ' + r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 80)) })
  p.on('dialog', (d) => d.dismiss())
  await p.addInitScript(() => { window.print = () => {}; window.open = () => null })
  await p.goto('http://localhost:4173'); await p.waitForTimeout(500)
  await entrada(p)
  await p.waitForSelector('body.in-coord', { timeout: 25000 }); await p.waitForTimeout(1500)
  const texto = async () => (await p.innerText('#portal').catch(() => '')).replace(/\s+/g, ' ')
  const ruim = async (onde) => { const t = await texto(); const m = t.match(RUIM); if (m) falha(`${nome} TEXTO RUIM (${onde}): …${t.slice(Math.max(0, m.index - 50), m.index + 30)}…`) }
  const abas = await p.locator('#coBar [data-top], #coBar [data-ctop]').evaluateAll((els) => els.map((e) => e.dataset.top || e.dataset.ctop))
  console.log(nome, 'abas:', abas.join(', '))
  for (const top of [...new Set(abas)]) {
    try {
      await p.locator(`#coBar [data-top="${top}"], #coBar [data-ctop="${top}"]`).first().click(); await p.waitForTimeout(1800)
      await ruim('aba ' + top)
      // seletores: percorre as opções
      const sels = await p.locator('#coMain select').count()
      for (let i = 0; i < Math.min(sels, 6); i++) {
        const opts = await p.locator('#coMain select').nth(i).locator('option').evaluateAll((o) => o.map((x) => x.value))
        for (const v of opts.slice(0, 6)) { await p.locator('#coMain select').nth(i).selectOption(v).catch(() => {}); await p.waitForTimeout(150) }
      }
      // busca
      const q = p.locator('#coMain input[type=search], #coMain input[placeholder*="Buscar"]')
      if (await q.count()) { await q.first().fill('a').catch(() => {}); await p.waitForTimeout(250); await q.first().fill('zzzz').catch(() => {}); await p.waitForTimeout(250); await q.first().fill('').catch(() => {}) }
      // botões seguros
      const rotulos = await p.locator('#coMain button, #coMain [role=tab]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.innerText || e.getAttribute('aria-label') || '').trim()).slice(0, 60))
      let n = 0
      for (const r of rotulos) {
        if (!r || PERIGO.test(r) || n >= 25) continue
        const el = p.locator('#coMain button, #coMain [role=tab]').filter({ hasText: r }).first()
        if (!(await el.count())) continue
        await el.click({ timeout: 1500 }).catch(() => {}); n++; await p.waitForTimeout(250)
        await p.keyboard.press('Escape').catch(() => {})
      }
      await ruim('aba ' + top + ' (após cliques)')
      ok(`${nome} aba ${top} (${sels} seletores, ${n} botões seguros)`)
    } catch (e) { falha(`${nome} aba ${top} → ${String(e.message).split('\n')[0].slice(0, 140)}`) }
  }
  await b.close()
}

;(async () => {
  await percorre('coordenação', null, async (p) => { await p.click('#restrBtn'); await p.fill('#email', 'teste@arena.com'); await p.fill('#pwd', 'teste'); await p.click('#entrar') })
  await percorre('professor', null, async (p) => { await p.click('#restrBtn'); await p.click('#row2 .p[data-k=prof]'); await p.fill('#email', 'professor@arena.com'); await p.fill('#pwd', 'teste'); await p.click('#entrar') })
  console.log('\nTOTAL DE FALHAS (coordenação/professor):', ach.length)
  ach.forEach((a) => console.log(' -', a))
  process.exit(ach.length ? 1 : 0)
})()
