import React, { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Undo2, Trash2, ZoomIn, ZoomOut, Save, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { CRITERIOS, calcularNota, formatarNota } from '../domain/grade.js'
import { rotuloEtapa } from '../domain/etapas.js'
import { sugerirNiveis, comentarioAuto } from '../domain/assistente.js'
import { CATEGORIAS } from '../domain/categorias.js'
import FotoMarcada from '../components/FotoMarcada.jsx'

function Correcao({ redacao, perfil, aoSalvar, aoVoltar, posicao }) {
  const [niveis, setNiveis] = useState([null, null, null, null, null])
  const [coment, setComent] = useState('')
  const [url, setUrl] = useState('')
  const [marcas, setMarcas] = useState([])
  const [cat, setCat] = useState('ort')
  const [zoom, setZoom] = useState(100)
  const [salvando, setSalvando] = useState(false)
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
    setSalvando(true)
    const row = { redacao_id: redacao.id, n1: niveis[0], n2: niveis[1], n3: niveis[2], n4: niveis[3], n5: niveis[4], comentario: coment }
    await supabase.from('correcoes').upsert(row)
    await supabase.from('marcacoes').delete().eq('redacao_id', redacao.id)
    if (marcas.length) await supabase.from('marcacoes').insert(marcas.map((m) => ({ redacao_id: redacao.id, tipo: m.tipo, categoria: m.categoria, dados: m.dados })))
    const etapa = perfil.tipo === 'coordenacao' ? 'corrigida' : 'aguardando_liberacao'
    await supabase.from('redacoes').update({ etapa, corretor_id: perfil.id }).eq('id', redacao.id)
    setSalvando(false)
    aoSalvar()
  }
  const sug = () => {
    const s = sugerirNiveis(marcas)
    setNiveis(niveis.map((v, i) => s[i] ?? v))
    if (!coment) setComent(comentarioAuto(marcas))
  }
  const cont = (c) => marcas.filter((m) => m.categoria === c).length

  return (
    <div>
      <div className="corr-topo">
        <button onClick={aoVoltar}><ChevronLeft size={14} style={{ verticalAlign: -2 }} /> Voltar</button>
        <div>
          <b style={{ fontFamily: 'Outfit', fontSize: 18 }}>{redacao.alunos?.nome}</b>
          <div><small>{redacao.propostas?.titulo} · {rotuloEtapa(redacao.etapa)}{redacao.fora_do_prazo ? ' · fora do prazo' : ''}</small></div>
        </div>
        <small style={{ marginLeft: 'auto' }}>{posicao}</small>
      </div>
      <div className="corr">
        <div className="visor">
          <div className="barra">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Diminuir"><ZoomOut size={14} /></button>
            <button disabled>{zoom}%</button>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} aria-label="Aumentar"><ZoomIn size={14} /></button>
            <button onClick={() => setMarcas(marcas.slice(0, -1))}><Undo2 size={14} /> Desfazer</button>
            <button onClick={() => setMarcas([])}><Trash2 size={14} /> Limpar</button>
            <span className={'pill ' + (marcas.length ? 'warn' : 'ok')}>{marcas.length} desvios</span>
          </div>
          <div className="cats">
            {CATEGORIAS.map((c) => (
              <button key={c.id} className={cat === c.id ? 'sel' : ''} style={{ '--c': CRITERIOS[c.crit - 1].cor }} onClick={() => setCat(c.id)}>
                {c.nome}{cont(c.id) ? ` · ${cont(c.id)}` : ''}
              </button>
            ))}
          </div>
          <div style={{ overflow: 'auto', maxHeight: '72vh' }}>
            <div style={{ width: `${zoom}%` }}>
              {url && <FotoMarcada url={url} marcacoes={marcas} onClick={(pt) => setMarcas([...marcas, { tmp: Date.now() + marcas.length, tipo: 'o', categoria: cat, dados: pt }])} />}
            </div>
          </div>
          <div className="dica">Clique na redação para marcar um desvio na categoria escolhida.</div>
        </div>
        <div className="lado">
          <div className="card" style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div className="eyebrow">Nota</div><small>soma dos níveis × 0,5</small></div>
            <span className="nota-grande">{formatarNota(nota)}</span>
          </div>
          <button onClick={sug}><Wand2 size={14} style={{ verticalAlign: -2 }} /> Sugerir níveis e comentário</button>
          {CRITERIOS.map((k, i) => (
            <div key={k.n} className="crit" style={{ '--c': k.cor }}>
              <div className="crit-top">
                <b>{k.romano} · {k.nome}</b>
                <div className="niveis">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button key={n} className={niveis[i] === n ? 'sel' : ''} onClick={() => setNiveis(niveis.map((v, j) => (j === i ? n : v)))}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <textarea placeholder="Comentário ao aluno" value={coment} onChange={(e) => setComent(e.target.value)} />
          <button className="pri" disabled={nota == null || salvando} onClick={salvar}><Save size={14} style={{ verticalAlign: -2 }} /> {salvando ? 'Salvando…' : 'Salvar correção'}</button>
        </div>
      </div>
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
  if (aberta) {
    const i = lista.findIndex((r) => r.id === aberta.id)
    return <Correcao redacao={aberta} perfil={perfil} posicao={`${i + 1} de ${lista.length}`} aoVoltar={() => setAberta(null)} aoSalvar={() => { setAberta(null); carregar() }} />
  }
  return (
    <section>
      <h2>Redações para corrigir ({lista.length})</h2>
      <p className="lead">Escolha uma redação para abrir a correção.</p>
      {lista.map((r) => (
        <article key={r.id} className="card row" onClick={() => setAberta(r)}>
          <b>{r.alunos?.nome}</b> <span>{r.propostas?.titulo}</span>
          <span className={'pill ' + (r.fora_do_prazo ? 'warn' : '')} style={{ marginLeft: 'auto' }}>{rotuloEtapa(r.etapa)}{r.fora_do_prazo ? ' · fora do prazo' : ''}</span>
        </article>
      ))}
      {!lista.length && <div className="card"><small>Nenhuma redação aguardando correção.</small></div>}
    </section>
  )
}
