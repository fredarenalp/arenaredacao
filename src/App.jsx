import React from 'react'
import { supabase } from './lib/supabase.js'

export default function App() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Arena Redação</h1>
      <p>{supabase ? 'Conectado ao banco.' : 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'}</p>
    </main>
  )
}
