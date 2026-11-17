import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(undefined) // undefined = carregando
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!supabase) { setSessao(null); return }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) { setPerfil(null); return }
    supabase.from('perfis').select('*').eq('id', sessao.user.id).maybeSingle()
      .then(({ data }) => setPerfil(data))
  }, [sessao])

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha })
  const sair = () => supabase.auth.signOut()
  return <Ctx.Provider value={{ sessao, perfil, entrar, sair }}>{children}</Ctx.Provider>
}
