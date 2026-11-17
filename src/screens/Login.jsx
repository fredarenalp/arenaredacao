import React, { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setCarregando(true); setErro('')
    const { error } = await entrar(email, senha)
    if (error) setErro('E-mail ou senha incorretos.')
    setCarregando(false)
  }
  return (
    <form className="card login" onSubmit={enviar}>
      <h1>Arena Redação</h1>
      <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
      {erro && <p className="erro">{erro}</p>}
      <button disabled={carregando}>{carregando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}
