import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { parseAlunos } from '../domain/importacao.js'

export default function ImportarAlunos() {
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')

  async function importar() {
    const { alunos, erros } = parseAlunos(texto)
    if (!alunos.length) return setMsg('Nenhuma linha válida.')
    const turmas = [...new Map(alunos.map((a) => [`${a.ano}|${a.serie}|${a.turma}`, { ano: a.ano, serie: a.serie, nome: a.turma }])).values()]
    const { data: t, error: e1 } = await supabase.from('turmas').upsert(turmas, { onConflict: 'ano,serie,nome' }).select()
    if (e1) return setMsg('Falha ao criar turmas.')
    const id = Object.fromEntries(t.map((x) => [`${x.ano}|${x.serie}|${x.nome}`, x.id]))
    const linhas = alunos.map((a) => ({ turma_id: id[`${a.ano}|${a.serie}|${a.turma}`], matricula: a.matricula, nome: a.nome }))
    const { error: e2 } = await supabase.from('alunos').upsert(linhas, { onConflict: 'matricula' })
    setMsg(e2 ? 'Falha ao importar alunos.' : `${linhas.length} alunos importados` + (erros.length ? `, ${erros.length} linhas ignoradas.` : '.'))
  }
  return (
    <div className="card">
      <h3>Importar alunos</h3>
      <p><small>Uma linha por aluno: ano;série;turma;matrícula;nome</small></p>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="2026;1;A;100;Nome do aluno" />
      <button onClick={importar}>Importar</button> {msg && <small>{msg}</small>}
    </div>
  )
}
