import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatarNota } from '../domain/grade.js'
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
  return (
    <section>
      <h2>Aguardando liberação ({fila.length})</h2>
      {fila.map((r) => (
        <article key={r.id} className="card row">
          <b>{r.alunos?.nome}</b> — {r.propostas?.titulo} · nota {formatarNota(Number(r.correcoes?.nota))}
          <button onClick={() => liberar(r)}>Liberar ao aluno</button>
        </article>
      ))}
      <Comunicados perfil={perfil} />
      <h2>Auditoria recente</h2>
      <ul>{eventos.map((e) => <li key={e.id}>{new Date(e.em).toLocaleString('pt-BR')} — {e.acao} (redação {e.redacao_id})</li>)}</ul>
      <Corretor perfil={perfil} />
    </section>
  )
}
