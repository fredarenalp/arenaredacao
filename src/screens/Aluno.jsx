import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { rotuloEtapa } from '../domain/etapas.js'
import FotoMarcada from '../components/FotoMarcada.jsx'
import { CRITERIOS, formatarNota } from '../domain/grade.js'

export default function Aluno({ perfil }) {
  const [aluno, setAluno] = useState(null)
  const [propostas, setPropostas] = useState([])
  const [redacoes, setRedacoes] = useState([])
  const [correcoes, setCorrecoes] = useState({})
  const [msg, setMsg] = useState('')
  const [vista, setVista] = useState(null) // { url, marcas }

  const carregar = useCallback(async () => {
    const { data: a } = await supabase.from('alunos').select('*').eq('perfil_id', perfil.id).maybeSingle()
    setAluno(a)
    const { data: p } = await supabase.from('propostas').select('*').order('id')
    setPropostas(p ?? [])
    const { data: r } = await supabase.from('redacoes').select('*').order('id')
    setRedacoes(r ?? [])
    const { data: c } = await supabase.from('correcoes').select('*')
    setCorrecoes(Object.fromEntries((c ?? []).map((x) => [x.redacao_id, x])))
  }, [perfil.id])
  useEffect(() => { carregar() }, [carregar])

  async function enviar(proposta, arquivo) {
    if (!arquivo || !aluno) return
    setMsg('Enviando…')
    const caminho = `${aluno.id}/${proposta.id}-${Date.now()}-${arquivo.name}`
    const up = await supabase.storage.from('redacoes').upload(caminho, arquivo)
    if (up.error) return setMsg('Falha no envio da foto.')
    const foraPrazo = proposta.prazo ? new Date() > new Date(proposta.prazo + 'T23:59:59') : false
    const { error } = await supabase.from('redacoes').insert({
      aluno_id: aluno.id, proposta_id: proposta.id, foto_path: caminho, fora_do_prazo: foraPrazo,
    })
    setMsg(error ? 'Você já enviou esta redação.' : 'Redação enviada!')
    carregar()
  }

  if (!aluno) return <p>Seu cadastro de aluno ainda não foi vinculado. Fale com a coordenação.</p>
  return (
    <section>
      <h2>Olá, {aluno.nome}</h2>
      {msg && <p className="aviso">{msg}</p>}
      {vista && <div className="card"><button onClick={() => setVista(null)}>Fechar</button><FotoMarcada url={vista.url} marcacoes={vista.marcas} /></div>}
      {propostas.map((p) => {
        const r = redacoes.find((x) => x.proposta_id === p.id)
        const c = r && correcoes[r.id]
        return (
          <article className="card" key={p.id}>
            <h3>{p.titulo} <small>({p.genero} · {p.bimestre}º bim.)</small></h3>
            {!r && <label>Enviar foto da redação <input type="file" accept="image/*" onChange={(e) => enviar(p, e.target.files[0])} /></label>}
            {r && !c?.liberada && <p>Etapa: <b>{rotuloEtapa(r.etapa)}</b></p>}
            {c?.liberada && (
              <div>
                <p>Nota: <b>{formatarNota(Number(c.nota))}</b></p>
                <ul>{CRITERIOS.map((k) => <li key={k.n} style={{ color: k.cor }}>{k.nome}: nível {c['n' + k.n]}</li>)}</ul>
                <button onClick={async () => {
                  const { data: u } = await supabase.storage.from('redacoes').createSignedUrl(r.foto_path, 600)
                  const { data: m } = await supabase.from('marcacoes').select('*').eq('redacao_id', r.id)
                  setVista({ url: u?.signedUrl, marcas: m ?? [] })
                }}>Ver correção na redação</button>
                {c.comentario && <p className="coment">{c.comentario}</p>}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
