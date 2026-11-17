// Ponte entre o protótipo (HTML/JS clássico) e o banco real (Supabase).
import { supabase } from './lib/supabase.js'

const TIPO_POR_LOGIN = { corretor: 'corretor', aluno: 'aluno', coord: 'coordenacao', prof: 'professor' }
const emailAluno = (matricula) => `${String(matricula).trim().toLowerCase()}@aluno.arena.com`

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

  async sair() {
    ARENA.perfil = null
    try { await supabase.auth.signOut() } catch { /* sem conexão: a sessão local expira sozinha */ }
  },
}

window.ARENA = ARENA
