import React, { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
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
    <div className="login-wrap">
      <aside className="login-lado">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Arena" />
          <h1>Arena<br />Redação</h1>
        </div>
        <small>Correção · Coordenação · Boletim</small>
      </aside>
      <section className="login-form">
        <form onSubmit={enviar}>
          <div className="eyebrow">Entrar</div>
          <h2>Acesse sua conta</h2>
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
          <label>Senha
            <span className="senha">
              <input style={{ width: '100%' }} type={ver ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} required />
              <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>{ver ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="pri" disabled={carregando}>{carregando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <small style={{ position: 'absolute', right: 20, bottom: 16 }}><Lock size={12} style={{ verticalAlign: -1 }} /> Área restrita</small>
      </section>
    </div>
  )
}
