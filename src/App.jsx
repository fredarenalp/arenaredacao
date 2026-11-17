import React from 'react'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { supabase } from './lib/supabase.js'
import Login from './screens/Login.jsx'
import Aluno from './screens/Aluno.jsx'
import Corretor from './screens/Corretor.jsx'
import Professor from './screens/Professor.jsx'
import Coordenacao from './screens/Coordenacao.jsx'

const TELAS = { aluno: Aluno, corretor: Corretor, professor: Professor, coordenacao: Coordenacao }

function Shell() {
  const { sessao, perfil, sair } = useAuth()
  if (!supabase) return <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p>
  if (sessao === undefined) return <p>Carregando…</p>
  if (!sessao) return <Login />
  if (!perfil) return <p>Seu acesso ainda não foi liberado pela coordenação.</p>
  const Tela = TELAS[perfil.tipo]
  return (
    <>
      <header><b>Arena Redação</b><span>{perfil.nome} · {perfil.tipo}</span><button onClick={sair}>Sair</button></header>
      <main><Tela perfil={perfil} /></main>
    </>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
