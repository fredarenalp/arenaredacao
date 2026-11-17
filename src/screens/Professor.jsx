import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatarNota } from '../domain/grade.js'

export default function Professor() {
  const [linhas, setLinhas] = useState([])
  useEffect(() => {
    supabase.from('redacoes').select('id, etapa, alunos(nome), propostas(titulo), correcoes(nota, liberada)')
      .then(({ data }) => setLinhas(data ?? []))
  }, [])
  return (
    <section>
      <h2>Minhas turmas</h2>
      <table className="card"><tbody>
        {linhas.map((r) => (
          <tr key={r.id}><td>{r.alunos?.nome}</td><td>{r.propostas?.titulo}</td>
            <td>{r.correcoes?.liberada ? formatarNota(Number(r.correcoes.nota)) : '—'}</td></tr>
        ))}
      </tbody></table>
    </section>
  )
}
