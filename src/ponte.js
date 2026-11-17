// Ponte entre o protótipo (HTML/JS clássico) e o banco real (Supabase).
import { supabase } from './lib/supabase.js'

const TIPO_POR_LOGIN = { corretor: 'corretor', aluno: 'aluno', coord: 'coordenacao', prof: 'professor' }
const emailAluno = (matricula) => `${String(matricula).trim().toLowerCase()}@aluno.arena.com`

const serTur = (a) => [a.s ?? Number(/(\d)º/.exec(a.turma || '')?.[1]), a.t ?? String(a.turma || '').trim().slice(-1)]
const fmtData = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '')

const ARENA = {
  supabase,
  perfil: null,

  // Devolve 'ok' | 'erro' (credenciais/perfil inválidos) | 'sys' (falha de conexão/servidor).
  async entrar(login, { email, mat, senha }) {
    try {
      const em = login === 'aluno' ? emailAluno(mat) : email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: senha })
      if (error) return error.status && error.status < 500 ? 'erro' : 'sys'
      const { data: perfil, error: e2 } = await supabase.from('perfis').select('*').eq('id', data.user.id).maybeSingle()
      if (e2) return 'sys'
      if (!perfil || !perfil.ativo || perfil.tipo !== TIPO_POR_LOGIN[login]) {
        await supabase.auth.signOut()
        return 'erro'
      }
      ARENA.perfil = perfil
      if (perfil.tipo === 'aluno') {
        const { data: al } = await supabase.from('alunos').select('id').eq('perfil_id', perfil.id).maybeSingle()
        supabase.from('acessos').insert({ perfil_id: perfil.id, aluno_id: al?.id ?? null }).then(() => {})
      }
      return 'ok'
    } catch {
      return 'sys'
    }
  },

  // ===== Corretor: pacotes reais no lugar dos pacotes de exemplo =====
  // Troca o conteúdo da lista global PACS (declarada no protótipo) pelos pacotes do corretor logado.
  async carregarCorretor() {
    const { data: pacs, error } = await supabase
      .from('pacotes')
      .select('*, propostas(titulo, genero), redacoes(id, obs, foto_path, etapa, alunos(nome, matricula, turmas(serie, nome)), correcoes(n1,n2,n3,n4,n5,comentario,anulacao,diag,extras), marcacoes(dados))')
      .eq('corretor_id', ARENA.perfil.id)
      .order('numero')
    if (error) throw error
    const novos = []
    for (const p of pacs) {
      const alunos = []
      for (const r of p.redacoes) {
        const c = r.correcoes?.[0] ?? r.correcoes
        let foto = null
        if (r.foto_path) {
          const { data: u } = await supabase.storage.from('redacoes').createSignedUrl(r.foto_path, 3600)
          foto = u?.signedUrl ?? null
        }
        const a = { n: r.alunos.nome, t: r.alunos.turmas ? `${r.alunos.turmas.serie}º${r.alunos.turmas.nome}` : '', m: r.alunos.matricula, foto, _rid: r.id, reesc: p.reescrita }
        if (c && c.n1 != null) a.niv = [c.n1, c.n2, c.n3, c.n4, c.n5]
        if (c?.anulacao) a.anul = c.anulacao
        window.__corretor.iniA(a)
        if (c) {
          if (c.comentario != null) a.obs = c.comentario
          if (c.diag != null) a.diag = c.diag
          a.nCorr = c.extras?.nCorr || 0
          if (c.n1 != null || c.anulacao) a.salvo = true
        }
        a.marks = (r.marcacoes ?? []).map((m) => m.dados)
        alunos.push(a)
      }
      novos.push({ n: p.numero, _pid: p.id, serie: p.serie, prop: p.rotulo, entrega: fmtData(p.entrega), prazo: fmtData(p.prazo), alunos, reesc: p.reescrita, atr: p.atrasadas })
    }
    window.__real = true
    const pn = ARENA.perfil.nome
    const ini = pn.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('')
    document.getElementById('phNome').textContent = `${pn} · Corretor(a)`
    document.getElementById('phAv').textContent = ini
    document.getElementById('phOla').textContent = `Olá, ${pn.split(' ')[0]}`
    const PACS = window.__corretor.PACS
    PACS.length = 0
    novos.forEach((x) => PACS.push(x))
  },

  // Grava a correção de um aluno (chamada pelo protótipo ao salvar).
  async salvarCorrecao(a) {
    if (!a._rid) return true
    const row = {
      redacao_id: a._rid,
      n1: a.anul ? null : a.niv[0], n2: a.anul ? null : a.niv[1], n3: a.anul ? null : a.niv[2],
      n4: a.anul ? null : a.niv[3], n5: a.anul ? null : a.niv[4],
      comentario: a.obs ?? '', anulacao: a.anul || null, diag: a.diag ?? null,
    }
    const soma = a.anul ? 0 : a.niv.reduce((x, y) => x + y, 0)
    // retida: anulada, nota 0 ou 10, suspeita de IA ou dúvida pendente -> o professor/coordenação decide
    const retida = !!a.anul || soma === 0 || soma === 20 || !!a.ia || !!(a.duvida && a.duvida.st === 'pend')
    row.extras = { nCorr: a.nCorr || 0, retida }
    row.liberada = !retida
    const r1 = await supabase.from('correcoes').upsert(row)
    if (r1.error) return false
    await supabase.from('marcacoes').delete().eq('redacao_id', a._rid)
    const marcas = (a.marks || []).map((m) => ({ redacao_id: a._rid, tipo: m.t === 'c' ? 'c' : 'o', categoria: m.cat ?? null, linha: m.line ?? null, dados: m }))
    if (marcas.length) {
      const r2 = await supabase.from('marcacoes').insert(marcas)
      if (r2.error) return false
    }
    await supabase.from('redacoes').update({ etapa: retida ? 'aguardando_liberacao' : 'corrigida', corretor_id: ARENA.perfil.id }).eq('id', a._rid)
    return true
  },

  // ===== Aluno =====
  async carregarAluno() {
    const uid = ARENA.perfil.id
    const { data: al, error: e0 } = await supabase.from('alunos').select('id, nome, matricula, turmas(serie, nome)').eq('perfil_id', uid).maybeSingle()
    if (e0 || !al) throw e0 || new Error('Cadastro de aluno não vinculado')
    ARENA.aluno = al
    const { data: props } = await supabase.from('propostas').select('*').order('bimestre').order('id')
    const { data: reds } = await supabase.from('redacoes').select('*, correcoes(n1,n2,n3,n4,n5,nota,comentario,liberada,liberada_em,anulacao), marcacoes(dados)').eq('aluno_id', al.id)
    window.__real = true
    const turma = al.turmas ? `${al.turmas.serie}º ano ${al.turmas.nome}` : ''
    document.getElementById('alNm').textContent = `${al.nome} · ${turma}`.replace(/ · $/, '')
    document.getElementById('alAv').textContent = al.nome.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('')

    const hoje = new Date().toISOString().slice(0, 10)
    const PROPS = window.__aluno.PROPS
    const ESSAYS = window.__aluno.ESSAYS
    PROPS.length = 0
    ESSAYS.length = 0
    const novaNota = (n) => String(Number(n).toFixed(1)).replace('.', ',')
    for (const [i, p] of props.entries()) {
      const num = i + 1
      const orig = reds.find((r) => r.proposta_id === p.id && r.versao === 1)
      const re = reds.find((r) => r.proposta_id === p.id && r.versao === 2)
      const lib = (r) => (r && r.correcoes && (Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes)?.liberada ? (Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes) : null)
      const item = async (r, versao) => {
        const base = { _pid: p.id, _v: versao }
        const rot = versao === 1 ? `Proposta ${num} · ${p.genero}` : `2ª versão (reescrita) · Proposta ${num}`
        const g = versao === 1 ? 'o' : 'r'
        const prazo = p.prazo ? `${p.prazo.slice(8, 10)}/${p.prazo.slice(5, 7)}` : ''
        if (!r) {
          if (versao === 2) {
            const c1 = lib(orig)
            if (!c1) return { ...base, g, t: rot, s: `Libera depois da correção da Proposta ${num}`, st: 'bl', l: 'Ainda não liberada', kind: 'block' }
            return { ...base, g, t: rot, s: 'Aberta para envio', st: 'ab', l: 'Aberta para envio', kind: 'open', cta: 'Enviar redação' }
          }
          const atrasada = p.prazo && p.prazo < hoje
          return atrasada
            ? { ...base, g, t: rot, s: `Prazo encerrado em ${prazo}`, st: 'at', l: 'Atrasada · ainda dá para enviar', kind: 'late', cta: 'Enviar com atraso' }
            : { ...base, g, t: rot, s: `Tema: ${p.titulo}${prazo ? ' · prazo ' + prazo : ''}`, st: 'ab', l: 'Aberta para envio', kind: 'open', cta: 'Enviar redação' }
        }
        const c = lib(r)
        if (!c) {
          const etapa = r.etapa === 'aguardando_liberacao' ? 'ret' : 'corr'
          return { ...base, g, t: rot, s: `Enviada em ${r.enviada_em.slice(8, 10)}/${r.enviada_em.slice(5, 7)}`, st: 'ok', l: etapa === 'ret' ? 'Aguardando liberação' : 'Enviada · aguardando correção', etapa }
        }
        let fotoUrl = null
        if (r.foto_path) fotoUrl = (await supabase.storage.from('redacoes').createSignedUrl(r.foto_path, 3600)).data?.signedUrl ?? null
        const marks = (r.marcacoes ?? []).map((m) => m.dados)
        const circ = marks.filter((m) => m.t === 'o' && m.line).map((m) => ({ l: m.line, x: Math.round(m.cx), c: m.cat, ...(m.pal ? { w: m.pal } : {}) }))
        const cmts = marks.filter((m) => m.t === 'c').map((m) => ({ l: m.line, x: Math.round(m.x ?? 176), j: m.j ?? m.crit ?? 1, t: m.txt ?? '' }))
        const dd = (c.liberada_em ?? r.enviada_em).slice(0, 10)
        return {
          ...base, g, t: rot, s: `Entregue em ${r.enviada_em.slice(8, 10)}/${r.enviada_em.slice(5, 7)} · corrigida`, st: 'ok',
          l: `Corrigida · nota ${novaNota(c.nota)}`, kind: 'corr', cta: 'Ver correção', niv: [c.n1, c.n2, c.n3, c.n4, c.n5],
          circ, cmts, fotoUrl, data: `${dd.slice(8, 10)}/${dd.slice(5, 7)}`,
        }
      }
      const io = PROPS.length
      PROPS.push(await item(orig, 1))
      const ir = PROPS.length
      PROPS.push(await item(re, 2))
      ESSAYS.push({ n: num, g: p.genero, tema: p.titulo, o: io, r: ir })
    }
    window.__aluno.recalc()
    if (props.length) window.__aluno.setBim(props[props.length - 1].bimestre)
  },

  // Envia a foto da redação (data URL escolhida no celular/computador) e cria o registro.
  async enviarRedacao(P, dataUrl, atraso) {
    try {
      if (!ARENA.aluno || !dataUrl) return false
      const blob = await (await fetch(dataUrl)).blob()
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/svg+xml' ? 'svg' : 'jpg'
      const path = `${ARENA.aluno.id}/${P._pid}-v${P._v}-${Date.now()}.${ext}`
      const up = await supabase.storage.from('redacoes').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (up.error) return false
      const { error } = await supabase.from('redacoes').insert({
        aluno_id: ARENA.aluno.id, proposta_id: P._pid, versao: P._v, foto_path: path, fora_do_prazo: !!atraso,
        obs: atraso ? `Atraso: ${atraso.mot}${atraso.txt ? ' — ' + atraso.txt : ''}` : null,
      })
      return !error
    } catch {
      return false
    }
  },

  // ===== Coordenação / Professor =====
  async carregarCoord() {
    const q = (t, sel = '*') => supabase.from(t).select(sel).limit(5000)
    const desde = new Date(Date.now() - 70 * 86400000).toISOString()
    const [perf, turm, alun, prop, pacs, reds, avis, even, ptur, acess] = await Promise.all([
      q('perfis'), q('turmas'), q('alunos', '*, turmas(serie, nome)'), q('propostas'), q('pacotes'),
      q('redacoes', 'id, aluno_id, proposta_id, versao, etapa, pacote_id, fora_do_prazo, enviada_em, corretor_id, correcoes(n1,n2,n3,n4,n5,nota,anulacao,liberada,extras)'),
      q('avisos', '*, alunos(nome, turmas(serie, nome)), propostas(numero, genero)'),
      supabase.from('eventos').select('*').order('em', { ascending: false }).limit(300),
      q('professor_turmas'),
      supabase.from('acessos').select('aluno_id, em').gte('em', desde).not('aluno_id', 'is', null).limit(20000),
    ])
    for (const r of [perf, turm, alun, prop, pacs, reds, avis, even, ptur, acess]) if (r.error) throw r.error
    const dm = (d) => (d ? `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}` : null)
    const dh = (t) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
    const C = window.__coord
    const nomeDe = Object.fromEntries(perf.data.map((x) => [x.id, x.nome]))

    // --- índices
    const alunos = alun.data.map((a) => ({ ...a, s: Number(a.turmas?.serie), t: a.turmas?.nome }))
    const byClass = {}
    for (const a of alunos) (byClass[`${a.s}|${a.t}`] ??= []).push(a)
    Object.values(byClass).forEach((l) => l.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')))
    const propByNum = Object.fromEntries(prop.data.map((x) => [x.numero, x]))
    const redOf = (aid, pid, v) => reds.data.find((r) => r.aluno_id === aid && r.proposta_id === pid && r.versao === v)
    const bimAtual = prop.data.length ? Math.max(...prop.data.map((x) => x.bimestre)) : 1
    const hoje = new Date().toISOString().slice(0, 10)
    const MOT = { 'Saúde': 'saude', Viagem: 'viagem', 'Problema técnico': 'outro', 'Esqueci ou perdi o prazo': 'desorganizacao', 'Outro motivo': 'outro' }

    const rowDe = (a, k, prop2) => {
      const n = prop2 > 10 ? prop2 - 10 : prop2
      const ver = prop2 > 10 ? 2 : 1
      const P = propByNum[n]
      const r = P ? redOf(a.id, P.id, ver) : null
      const st = r ? (r.fora_do_prazo ? 'atr' : 'ent') : 'nao'
      const av = P ? avis.data.find((x) => x.aluno_id === a.id && x.proposta_id === P.id && x.tipo === 'atraso') : null
      const meus = reds.data.filter((x) => x.aluno_id === a.id)
      const nao = prop.data.filter((x) => x.bimestre === bimAtual && x.series.includes(a.s) && x.prazo && x.prazo < hoje && !redOf(a.id, x.id, 1)).length
      return {
        nome: a.nome, s: a.s, t: a.t, k, st, cat: st === 'atr' ? (MOT[av?.motivo] || 'nao_informou') : null,
        env: r ? dh(r.enviada_em) : '—', nao, atr: meus.filter((x) => x.fora_do_prazo).length,
        baixa: meus.filter((x) => { const c = Array.isArray(x.correcoes) ? x.correcoes[0] : x.correcoes; return c && c.liberada && c.nota != null && c.nota < 5 }).length,
        sem1: !meus.some((x) => x.versao === 1), semR: !meus.some((x) => x.versao === 2), seed: a.id,
      }
    }
    const DIAS = { semana: 7, mes: 30, bimestre: 60 }
    const cellReal = (s, t, metric, per, off) => {
      const lista = byClass[`${s}|${t}`] || []
      const d = DIAS[per] || 7
      const fim = Date.now() - off * d * 86400000
      const ini = fim - d * 86400000
      const em = (x) => { const v = new Date(x).getTime(); return v >= ini && v < fim }
      let q = 0
      for (const a of lista) {
        if (metric === 'acesso') q += acess.data.some((x) => x.aluno_id === a.id && em(x.em)) ? 1 : 0
        else if (metric === 'envio') q += reds.data.some((x) => x.aluno_id === a.id && em(x.enviada_em)) ? 1 : 0
        else q += reds.data.some((x) => x.aluno_id === a.id && x.fora_do_prazo && em(x.enviada_em)) || prop.data.some((x) => x.series.includes(s) && x.prazo && x.prazo < hoje && new Date(x.prazo).getTime() >= ini && new Date(x.prazo).getTime() < fim && !redOf(a.id, x.id, 1)) ? 1 : 0
      }
      return { n: lista.length, q, p: lista.length ? Math.round((q / lista.length) * 100) : 0 }
    }
    window.__coordDB = {
      nAl: (s, t) => (byClass[`${s}|${t}`] || []).length,
      alunosTurma: (s, t, prop2) => (byClass[`${s}|${t}`] || []).map((a, k) => rowDe(a, k, prop2)),
      slotsNao: (s, t, k) => {
        const a = (byClass[`${s}|${t}`] || [])[k]
        if (!a) return []
        return prop.data.filter((x) => x.bimestre === bimAtual && x.series.includes(s) && x.prazo && x.prazo < hoje && !redOf(a.id, x.id, 1)).map((x) => ({ p: x.numero, v: 1 }))
      },
      // percentual de alunos da turma por métrica e período (janela atual) e tendência vs. janela anterior
      cell: (s, t, metric, per) => cellReal(s, t, metric, per, 0),
      trend: (s, metric, per) => {
        const q = (off) => { let n = 0, c = 0; for (const key of Object.keys(byClass)) { if (key.startsWith(s + '|')) { const r = cellReal(s, key.split('|')[1], metric, per, off); n += r.n; c += r.q } } return n ? Math.round((c / n) * 100) : 0 }
        return q(0) - q(1)
      },
      mat: (s, t, k) => (byClass[`${s}|${t}`] || [])[k]?.matricula ?? '',
      PR: (s) => prop.data.filter((x) => x.bimestre === bimAtual && x.series.includes(s)).map((x) => x.numero).sort((a, b) => a - b),
    }

    // --- listas globais do protótipo (conteúdo trocado no lugar)
    const fill = (arr, items) => { arr.length = 0; items.forEach((x) => arr.push(x)) }
    fill(C.CORR, perf.data.filter((x) => x.tipo === 'corretor').map((x) => ({ id: x.id, n: x.nome, pausado: !x.ativo })))
    fill(C.PROFS, perf.data.filter((x) => x.tipo === 'professor').map((x) => {
      const tid = ptur.data.find((y) => y.perfil_id === x.id)?.turma_id
      const serie = Number(turm.data.find((y) => y.id === tid)?.serie) || 7
      return { id: x.id, n: `Prof. ${x.nome}`, s: serie }
    }))
    if (C.PROFS.length) C.S.pid = C.PROFS[0].id
    fill(C.PRP, prop.data.map((x) => ({
      id: x.id, bim: x.bimestre, n: x.numero, g: x.genero, t: x.titulo, ser: x.series, p1: dm(x.prazo), p2: dm(x.prazo2),
      ...(x.sem_reescrita ? { semRe: true } : {}), st: x.status,
    })))
    fill(C.BIMC, [1, 2, 3, 4].map((n) => ({ n, st: n < bimAtual ? 'enc' : n === bimAtual ? 'and' : 'fut', d: n < bimAtual ? 'encerrado' : n === bimAtual ? 'em andamento' : 'ainda não começou' })))
    const nPac = Object.fromEntries(pacs.data.map((x) => [x.id, reds.data.filter((r) => r.pacote_id === x.id)]))
    fill(C.PACS, pacs.data.map((x) => {
      const rs = nPac[x.id]
      const feitas = rs.filter((r) => { const c = Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes; return c && (c.n1 != null || c.anulacao) }).length
      const o = { id: x.numero, turma: x.serie, prop: x.rotulo, ver: x.reescrita ? '2ª' : '1ª', n: rs.length, prazo: dm(x.prazo) || '', c: x.corretor_id, ok: feitas, _pid: x.id }
      o.g = C.genero(x.rotulo); o.sg = x.reescrita; o.gan = { aluno: null, prof: null, cor: null }
      return o
    }))
    const pacDe = Object.fromEntries(pacs.data.map((x) => [x.id, x.numero]))
    fill(C.FILA, reds.data.filter((r) => r.etapa === 'aguardando_liberacao').map((r, i) => {
      const c = Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes
      const a = alunos.find((x) => x.id === r.aluno_id)
      const niv = c && c.n1 != null ? [c.n1, c.n2, c.n3, c.n4, c.n5] : [0, 0, 0, 0, 0]
      return { id: r.id, pac: pacDe[r.pacote_id] ?? 0, idx: i, aluno: a?.nome ?? '', c: r.corretor_id, nota: c?.nota != null ? Number(c.nota) : 0, niv, st: 'pend', mot: c?.anulacao ? `Redação anulada: ${c.anulacao}` : '', _rid: r.id }
    }))
    fill(C.AVISOS, avis.data.map((x) => ({
      id: x.id, aluno: x.alunos?.nome ?? '', turma: x.alunos?.turmas ? `${x.alunos.turmas.serie}º ano ${x.alunos.turmas.nome}` : '',
      prop: x.propostas ? `Proposta ${x.propostas.numero} · ${x.propostas.genero}` : '', tipo: x.tipo === 'ausencia' ? 'Não vai entregar' : x.motivo, txt: x.texto || '',
      quando: dh(x.criado_em), st: x.status === 'pend' ? 'pend' : x.status === 'aceito' ? 'lib' : 'rec',
      ...(x.status !== 'pend' ? { res: dh(x.decidido_em || x.criado_em) } : {}),
    })))
    fill(C.LOG, even.data.filter((e) => e.texto).map((e) => ({ t: dh(e.em), bim: bimAtual, q: nomeDe[e.autor] || 'Coordenação', k: e.tipo || 'outro', x: e.texto })))
    C.resetAidx()
    // regras gravadas
    const { data: regras } = await supabase.from('regras').select('chave, valor')
    for (const r of regras ?? []) { if (r.chave === 'r1') C.S.r1 = r.valor; else C.R[r.chave] = r.valor }
    // equipe (coordenação + professores) e alunos que saíram
    const eq = perf.data.filter((x) => x.tipo === 'coordenacao' || x.tipo === 'professor')
    fill(C.EQUIPE, [
      { n: 'Coordenação (você)', e: ARENA.perfil.email || '', r: 'coord', _id: ARENA.perfil.id },
      ...eq.filter((x) => x.id !== ARENA.perfil.id).map((x) => ({ n: x.nome, e: x.email || '', r: x.tipo === 'professor' ? 'prof' : 'coord', ...(x.tipo === 'professor' ? { s: C.PROFS.find((q) => q.id === x.id)?.s || 7 } : {}), _id: x.id })),
    ])
    Object.keys(C.SAIU).forEach((k) => delete C.SAIU[k])
    alunos.filter((a) => a.saiu).forEach((a) => { C.SAIU[a.matricula] = true })
    ARENA._coord = { alunos, byClass, turmas: turm.data, perf: perf.data, byMat: Object.fromEntries(alunos.map((a) => [a.matricula, a])) }
    ARENA._snap = ARENA.tirarFoto()
    Object.assign(C.PLAB, { semana: 'Últimos 7 dias', mes: 'Últimos 30 dias', bimestre: 'Bimestre atual' })
    window.__real = true
    window.__coordNomes = nomeDe
  },

  // ===== Sincronização: o que a coordenação muda na tela vai para o banco =====
  tirarFoto() {
    const C = window.__coord
    return {
      log: new Set(C.LOG),
      avisos: Object.fromEntries(C.AVISOS.map((a) => [a.id, `${a.st}|${a.dest || ''}`])),
      pacs: Object.fromEntries(C.PACS.map((x) => [x.id, x.c || ''])),
      fila: Object.fromEntries(C.FILA.map((f) => [f.id, f.st])),
      corr: Object.fromEntries(C.CORR.map((c) => [c.id, !!c.pausado])),
      prp: Object.fromEntries(C.PRP.map((q) => [q.id, JSON.stringify([q.bim, q.n, q.g, q.t, q.ser, q.p1, q.p2, q.st, !!q.semRe])])),
      regras: JSON.stringify({ r1: C.S.r1, ...C.R }),
      cad: Object.fromEntries(C.aidx().map((a) => [a.mat, serTur(a).join('|')])),
      saiu: JSON.stringify(C.SAIU),
      senha: JSON.stringify(C.SENHA),
      equipe: JSON.stringify(C.EQUIPE.map((p) => [p._id || '', p.n, p.e, p.r, p.s || 0])),
    }
  },

  _syncTimer: null,
  sincronizarCoord() {
    clearTimeout(ARENA._syncTimer)
    ARENA._syncTimer = setTimeout(() => ARENA._sincronizar().catch((e) => console.error('sync', e)), 400)
  },

  async _sincronizar() {
    if (!ARENA._snap || !ARENA.perfil) return
    const C = window.__coord
    const prev = ARENA._snap
    const eu = ARENA.perfil.id
    const ymd = (dm, ano = new Date().getFullYear()) => { const m = /(\d{2})\/(\d{2})/.exec(dm || ''); return m ? `${ano}-${m[2]}-${m[1]}` : null }
    const falhas = []
    const ok = (r) => { if (r && r.error) falhas.push(r.error.message) }

    // histórico
    const novos = C.LOG.filter((x) => !prev.log.has(x))
    for (const x of novos.reverse()) ok(await supabase.from('eventos').insert({ autor: eu, acao: 'log', texto: x.x, tipo: x.k }))

    // avisos (aceitar / recusar / corretor destino)
    for (const a of C.AVISOS) {
      const antes = prev.avisos[a.id]
      const agora = `${a.st}|${a.dest || ''}`
      if (antes === undefined || antes === agora || typeof a.id !== 'number') continue
      const st = a.st === 'lib' ? 'aceito' : a.st === 'rec' ? 'recusado' : 'pend'
      ok(await supabase.from('avisos').update({ status: st, destino: a.dest || null, decidido_por: st === 'pend' ? null : eu, decidido_em: st === 'pend' ? null : new Date().toISOString() }).eq('id', a.id))
    }

    // pacotes: atribuição de corretor
    for (const x of C.PACS) {
      if (x._pid && (prev.pacs[x.id] ?? '') !== (x.c || '')) ok(await supabase.from('pacotes').update({ corretor_id: x.c || null }).eq('id', x._pid))
    }

    // fila de liberação (retidas): quando o professor/coordenação libera ou modifica
    for (const f of C.FILA) {
      if (prev.fila[f.id] === 'pend' && f.st === 'lib' && f._rid) {
        const upd = { liberada: true }
        if (f.novo) Object.assign(upd, { n1: f.novo[0], n2: f.novo[1], n3: f.novo[2], n4: f.novo[3], n5: f.novo[4] })
        ok(await supabase.from('correcoes').update(upd).eq('redacao_id', f._rid))
        ok(await supabase.from('redacoes').update({ etapa: 'corrigida' }).eq('id', f._rid))
      }
    }

    // corretores pausados / ativos
    for (const c of C.CORR) if (prev.corr[c.id] !== undefined && prev.corr[c.id] !== !!c.pausado) ok(await supabase.from('perfis').update({ ativo: !c.pausado }).eq('id', c.id))

    // propostas: criar / alterar
    for (const q of C.PRP) {
      const assin = JSON.stringify([q.bim, q.n, q.g, q.t, q.ser, q.p1, q.p2, q.st, !!q.semRe])
      if (prev.prp[q.id] === assin) continue
      const ano = new Date().getFullYear()
      const row = { ano, bimestre: q.bim, numero: q.n, genero: q.g, titulo: q.t, series: q.ser, prazo: ymd(q.p1), prazo2: ymd(q.p2), status: q.st, sem_reescrita: !!q.semRe }
      if (prev.prp[q.id] === undefined) {
        const r = await supabase.from('propostas').insert(row).select('id').single()
        if (r.error) ok(r); else { q.id = r.data.id; prev.prp[q.id] = assin }
      } else ok(await supabase.from('propostas').update(row).eq('id', q.id))
    }

    // alunos: novos, mudança de turma, saída, nova senha
    const K = ARENA._coord
    const ano = new Date().getFullYear()
    const turmaId = async (sr, nome) => {
      let t = K.turmas.find((x) => String(x.serie) === String(sr) && x.nome === nome)
      if (!t) {
        const r = await supabase.from('turmas').insert({ ano, serie: String(sr), nome }).select().single()
        if (r.error) { ok(r); return null }
        t = r.data; K.turmas.push(t)
      }
      return t.id
    }
    const senhaDe = (mat) => C.SENHA[mat] || C.senhaDe(mat)
    for (const a0 of C.aidx()) {
      const [sr, tn] = serTur(a0)
      const a = { ...a0, s: sr, t: tn }
      const noBanco = K.byMat[a.mat]
      const chave = `${sr}|${tn}`
      if (!noBanco) {
        const tid = await turmaId(a.s, a.t)
        if (!tid) continue
        const r = await supabase.from('alunos').insert({ matricula: a.mat, nome: a.nome, turma_id: tid }).select('*, turmas(serie, nome)').single()
        if (r.error) { ok(r); continue }
        const novo = { ...r.data, s: a.s, t: a.t }
        K.byMat[a.mat] = novo; K.alunos.push(novo); (K.byClass[chave] ??= []).push(novo)
        const f = await supabase.functions.invoke('criar-usuario', { body: { tipo: 'aluno', matricula: a.mat, nome: a.nome, senha: senhaDe(a.mat) } })
        if (f.error || f.data?.erro) falhas.push('Acesso do aluno ' + a.nome + ': ' + (f.data?.erro || f.error.message))
      } else if (prev.cad[a.mat] !== undefined && prev.cad[a.mat] !== chave) {
        const tid = await turmaId(a.s, a.t)
        if (tid) {
          ok(await supabase.from('alunos').update({ turma_id: tid }).eq('id', noBanco.id))
          const velha = `${noBanco.s}|${noBanco.t}`
          K.byClass[velha] = (K.byClass[velha] || []).filter((x) => x.id !== noBanco.id)
          noBanco.s = a.s; noBanco.t = a.t; noBanco.turma_id = tid; (K.byClass[chave] ??= []).push(noBanco)
        }
      }
    }
    const saiuAgora = JSON.parse(JSON.stringify(C.SAIU)), saiuAntes = JSON.parse(prev.saiu)
    for (const mat of new Set([...Object.keys(saiuAgora), ...Object.keys(saiuAntes)])) {
      if (!!saiuAgora[mat] !== !!saiuAntes[mat] && K.byMat[mat]) { ok(await supabase.from('alunos').update({ saiu: !!saiuAgora[mat] }).eq('id', K.byMat[mat].id)); K.byMat[mat].saiu = !!saiuAgora[mat] }
    }
    const sAgora = JSON.parse(JSON.stringify(C.SENHA)), sAntes = JSON.parse(prev.senha)
    for (const mat of Object.keys(sAgora)) {
      if (sAgora[mat] !== sAntes[mat] && K.byMat[mat]?.perfil_id) {
        const f = await supabase.functions.invoke('criar-usuario', { body: { acao: 'senha', matricula: mat, senha: sAgora[mat] } })
        if (f.error || f.data?.erro) falhas.push('Senha de ' + mat + ': ' + (f.data?.erro || f.error.message))
      }
    }

    // equipe: nova pessoa, papel e série
    const eqAgora = JSON.stringify(C.EQUIPE.map((p) => [p._id || '', p.n, p.e, p.r, p.s || 0]))
    if (eqAgora !== prev.equipe) {
      for (const p of C.EQUIPE) {
        const antigo = JSON.parse(prev.equipe).find((x) => x[0] === p._id)
        if (!p._id) {
          if (!p.e) { falhas.push('Informe o e-mail de ' + p.n); continue }
          const senha = Math.random().toString(36).slice(2, 10)
          const tid = p.r === 'prof' ? K.turmas.filter((x) => Number(x.serie) === p.s).map((x) => x.id) : []
          const f = await supabase.functions.invoke('criar-usuario', { body: { tipo: p.r === 'prof' ? 'professor' : 'coordenacao', email: p.e, nome: p.n.replace(/^Prof\.\s*/, ''), senha, turma_ids: tid } })
          if (f.error || f.data?.erro) falhas.push(p.n + ': ' + (f.data?.erro || f.error.message))
          else { p._id = f.data.id; window.alert(`Acesso criado para ${p.n}\nE-mail: ${p.e}\nSenha inicial: ${senha}\nAnote e passe à pessoa (ela pode ser trocada depois).`) }
        } else if (antigo && antigo[3] !== p.r) {
          ok(await supabase.from('perfis').update({ tipo: p.r === 'prof' ? 'professor' : 'coordenacao' }).eq('id', p._id))
        } else if (antigo && p.r === 'prof' && antigo[4] !== (p.s || 0)) {
          ok(await supabase.from('professor_turmas').delete().eq('perfil_id', p._id))
          const ids = K.turmas.filter((x) => Number(x.serie) === p.s).map((x) => ({ perfil_id: p._id, turma_id: x.id }))
          if (ids.length) ok(await supabase.from('professor_turmas').insert(ids))
        }
      }
    }

    // regras
    const reg = JSON.stringify({ r1: C.S.r1, ...C.R })
    if (reg !== prev.regras) {
      const nova = JSON.parse(reg), velha = JSON.parse(prev.regras)
      for (const k of Object.keys(nova)) if (JSON.stringify(nova[k]) !== JSON.stringify(velha[k])) ok(await supabase.from('regras').upsert({ chave: k, valor: nova[k], atualizada_por: eu, atualizada_em: new Date().toISOString() }))
    }

    if (falhas.length) {
      console.error('Falhas ao gravar', falhas)
      const t = document.getElementById('toast')
      if (t) { t.textContent = 'Não foi possível gravar tudo no servidor. Recarregue a página e confira.'; t.classList.add('on') }
    }
    ARENA._snap = ARENA.tirarFoto()
  },

  async sair() {
    ARENA.perfil = null
    try { await supabase.auth.signOut() } catch { /* sem conexão: a sessão local expira sozinha */ }
  },
}

window.ARENA = ARENA
