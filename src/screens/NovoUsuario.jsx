import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function NovoUsuario() {
  const [f, setF] = useState({ nome: '', email: '', senha: '', tipo: 'corretor', aluno_id: '' })
  const [alunos, setAlunos] = useState([])
  const [msg, setMsg] = useState('')
  useEffect(() => {
    supabase.from('alunos').select('id, nome, matricula').is('perfil_id', null).order('nome').then(({ data }) => setAlunos(data ?? []))
  }, [msg])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function criar(e) {
    e.preventDefault()
    setMsg('Criando…')
    const corpo = { ...f, aluno_id: f.tipo === 'aluno' && f.aluno_id ? Number(f.aluno_id) : undefined }
    const { data, error } = await supabase.functions.invoke('criar-usuario', { body: corpo })
    if (error || data?.erro) {
      const detalhe = data?.erro ?? (await error?.context?.json?.().then((j) => j.erro).catch(() => null))
      return setMsg(detalhe ?? 'Falha ao criar usuário.')
    }
    setMsg(`Usuário ${f.email} criado.`)
    setF({ nome: '', email: '', senha: '', tipo: f.tipo, aluno_id: '' })
  }
  return (
    <form className="card" onSubmit={criar}>
      <h3>Novo usuário</h3>
      <label>Nome<input value={f.nome} onChange={set('nome')} required /></label>
      <label>E-mail<input type="email" value={f.email} onChange={set('email')} required /></label>
      <label>Senha (mín. 6)<input type="text" value={f.senha} onChange={set('senha')} required minLength={6} /></label>
      <label>Perfil
        <select value={f.tipo} onChange={set('tipo')}>
          <option value="corretor">Corretor</option><option value="professor">Professor</option>
          <option value="aluno">Aluno</option><option value="coordenacao">Coordenação</option>
        </select>
      </label>
      {f.tipo === 'aluno' && (
        <label>Vincular ao cadastro do aluno
          <select value={f.aluno_id} onChange={set('aluno_id')} required>
            <option value="">Escolha…</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>)}
          </select>
        </label>
      )}
      <button>Criar usuário</button> {msg && <small>{msg}</small>}
    </form>
  )
}
