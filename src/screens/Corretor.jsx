import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CRITERIOS, calcularNota, formatarNota } from '../domain/grade.js'
import { rotuloEtapa } from '../domain/etapas.js'
import { sugerirNiveis, comentarioAuto } from '../domain/assistente.js'
import { CATEGORIAS } from '../domain/categorias.js'
import FotoMarcada from '../components/FotoMarcada.jsx'

function Correcao({ redacao, perfil, aoSalvar }) {
  const [niveis, setNiveis] = useState([null, null, null, null, null])
  const [coment, setComent] = useState('')
  const [url, setUrl] = useState('')
  const [marcas, setMarcas] = useState([])
  const [cat, setCat] = useState('ort')
  const nota = calcularNota(niveis)

  useEffect(() => {
    supabase.storage.from('redacoes').createSignedUrl(redacao.foto_path, 600).then(({ data }) => setUrl(data?.signedUrl ?? ''))
    supabase.from('marcacoes').select('*').eq('redacao_id', redacao.id).then(({ data }) => setMarcas(data ?? []))
    supabase.from('correcoes').select('*').eq('redacao_id', redacao.id).maybeSingle().then(({ data }) => {
      if (data) { setNiveis([data.n1, data.n2, data.n3, data.n4, data.n5]); setComent(data.comentario ?? '') }
    })
  }, [redacao])

  async function salvar() {
    if (nota == null) return
    const row = { redacao_id: redacao.id, n1: niveis[0], n2: niveis[1], n3: niveis[2], n4: niveis[3], n5: niveis[4], comentario: coment }
    await supabase.from('correcoes').upsert(row)
    await supabase.from('marcacoes').delete().eq('redacao_id', redacao.id)
    if (marcas.length) await supabase.from('marcacoes').insert(marcas.map((m) => ({ redacao_id: redacao.id, tipo: m.tipo, categoria: m.categoria, dados: m.dados })))
    const etapa = perfil.tipo === 'coordenacao' ? 'corrigida' : 'aguardando_liberacao'
    await supabase.from('redacoes').update({ etapa, corretor_id: perfil.id }).eq('id', redacao.id)
    aoSalvar()
  }
  return (
    <div className="card">
      <select value={cat} onChange={(e) => setCat(e.target.value)}>
        {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.crit} · {c.nome}</option>)}
      </select>
      <button onClick={() => setMarcas(marcas.slice(0, -1))}>Desfazer marcação</button>
      {url && <FotoMarcada url={url} marcacoes={marcas}
        onClick={(pt) => setMarcas([...marcas, { tmp: Date.now(), tipo: 'o', categoria: cat, dados: pt }])} />}
      {CRITERIOS.map((k, i) => (
        <div key={k.n} className="crit" style={{ borderLeft: `4px solid ${k.cor}` }}>
          <span>{k.n}. {k.nome}</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <button key={n} className={niveis[i] === n ? 'sel' : ''} onClick={() => setNiveis(niveis.map((v, j) => (j === i ? n : v)))}>{n}</button>
          ))}
        </div>
      ))}
      <button onClick={() => {
        const sug = sugerirNiveis(marcas)
        setNiveis(niveis.map((v, i) => (sug[i] ?? v)))
        if (!coment) setComent(comentarioAuto(marcas))
      }}>Sugerir níveis e comentário</button>
      <textarea placeholder="Comentário ao aluno" value={coment} onChange={(e) => setComent(e.target.value)} />
      <p>Nota: <b>{formatarNota(nota)}</b></p>
      <button disabled={nota == null} onClick={salvar}>Salvar correção</button>
    </div>
  )
}

export default function Corretor({ perfil }) {
  const [lista, setLista] = useState([])
  const [aberta, setAberta] = useState(null)
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('redacoes').select('*, alunos(nome), propostas(titulo)').in('etapa', ['enviada', 'em_correcao']).order('enviada_em')
    setLista(data ?? [])
  }, [])
  useEffect(() => { carregar() }, [carregar])
  if (aberta) return <><button onClick={() => setAberta(null)}>← Voltar</button><Correcao redacao={aberta} perfil={perfil} aoSalvar={() => { setAberta(null); carregar() }} /></>
  return (
    <section>
      <h2>Redações para corrigir ({lista.length})</h2>
      {lista.map((r) => (
        <article key={r.id} className="card row" onClick={() => setAberta(r)}>
          <b>{r.alunos?.nome}</b> — {r.propostas?.titulo} <small>{rotuloEtapa(r.etapa)}{r.fora_do_prazo ? ' · fora do prazo' : ''}</small>
        </article>
      ))}
    </section>
  )
}
