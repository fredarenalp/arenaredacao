import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatarNota } from '../domain/grade.js'
import NovoUsuario from './NovoUsuario.jsx'
import ImportarAlunos from './ImportarAlunos.jsx'
import Corretor from './Corretor.jsx'

function Comunicados({ perfil }) {
  const [alunos, setAlunos] = useState([])
  const [aluno, setAluno] = useState('')
  const [texto, setTexto] = useState('')
  const [ok, setOk] = useState('')
  useEffect(() => { supabase.from('alunos').select('id, nome').order('nome').then(({ data }) => setAlunos(data ?? [])) }, [])
  async function enviar() {
    if (!aluno || !texto.trim()) return
    const { error } = await supabase.from('comunicados').insert({ aluno_id: Number(aluno), texto: texto.trim(), criado_por: perfil.id })
    setOk(error ? 'Falha ao enviar.' : 'Comunicado enviado.')
    if (!error) setTexto('')
  }
  return (
    <div className="card">
      <h3>Comunicado extraordinário</h3>
      <select value={aluno} onChange={(e) => setAluno(e.target.value)}>
        <option value="">Aluno…</option>
        {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem ao aluno" />
      <button onClick={enviar}>Enviar</button> {ok && <small>{ok}</small>}
    </div>
  )
}

export default function Coordenacao({ perfil }) {
  const [fila, setFila] = useState([])
  const [eventos, setEventos] = useState([])
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('redacoes').select('*, alunos(nome), propostas(titulo), correcoes(nota, liberada)').eq('etapa', 'aguardando_liberacao')
    setFila(data ?? [])
    const { data: ev } = await supabase.from('eventos').select('*').order('em', { ascending: false }).limit(20)
    setEventos(ev ?? [])
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function liberar(r) {
    await supabase.from('correcoes').update({ liberada: true }).eq('redacao_id', r.id)
    await supabase.from('redacoes').update({ etapa: 'corrigida' }).eq('id', r.id)
    await supabase.from('eventos').insert({ redacao_id: r.id, autor: perfil.id, acao: 'liberada' })
    carregar()
  }
  const [aba, setAba] = useState('liberacao')
  const ABAS = [['liberacao', `Liberação (${fila.length})`], ['corrigir', 'Corrigir'], ['comunicados', 'Comunicados'], ['cadastros', 'Cadastros'], ['auditoria', 'Auditoria']]
  return (
    <section>
      <div className="tabs" role="tablist">
        {ABAS.map(([k, t]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{t}</button>)}
      </div>
      {aba === 'liberacao' && (
        <div>
          <h2>Aguardando liberação</h2>
          <p className="lead">Correções prontas. O aluno só vê a nota depois que você liberar.</p>
          {fila.map((r) => (
            <article key={r.id} className="card row" style={{ cursor: 'default' }}>
              <b>{r.alunos?.nome}</b> <span>{r.propostas?.titulo}</span>
              <span className="pill" style={{ marginLeft: 'auto' }}>nota {formatarNota(Number(r.correcoes?.nota))}</span>
              <button className="pri" onClick={() => liberar(r)}>Liberar ao aluno</button>
            </article>
          ))}
          {!fila.length && <div className="card"><small>Nada aguardando liberação.</small></div>}
        </div>
      )}
      {aba === 'corrigir' && <Corretor perfil={perfil} />}
      {aba === 'comunicados' && <Comunicados perfil={perfil} />}
      {aba === 'cadastros' && <><NovoUsuario /><ImportarAlunos /></>}
      {aba === 'auditoria' && (
        <div>
          <h2>Auditoria recente</h2>
          <div className="card">
            {eventos.map((e) => <div key={e.id} className="crs"><span>{e.acao.replace('_', ' ')} · redação {e.redacao_id}</span><small>{new Date(e.em).toLocaleString('pt-BR')}</small></div>)}
            {!eventos.length && <small>Sem registros ainda.</small>}
          </div>
        </div>
      )}
    </section>
  )
}
