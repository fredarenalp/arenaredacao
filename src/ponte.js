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
      comentario: a.obs ?? '', anulacao: a.anul || null, diag: a.diag ?? null, extras: { nCorr: a.nCorr || 0 },
    }
    const r1 = await supabase.from('correcoes').upsert(row)
    if (r1.error) return false
    await supabase.from('marcacoes').delete().eq('redacao_id', a._rid)
    const marcas = (a.marks || []).map((m) => ({ redacao_id: a._rid, tipo: m.t === 'c' ? 'c' : 'o', categoria: m.cat ?? null, linha: m.line ?? null, dados: m }))
    if (marcas.length) {
      const r2 = await supabase.from('marcacoes').insert(marcas)
      if (r2.error) return false
    }
    await supabase.from('redacoes').update({ etapa: 'aguardando_liberacao', corretor_id: ARENA.perfil.id }).eq('id', a._rid)
    return true
  },

  async sair() {
    ARENA.perfil = null
    try { await supabase.auth.signOut() } catch { /* sem conexão: a sessão local expira sozinha */ }
  },
}

window.ARENA = ARENA
