# Arena Redação

Sistema de correção de redações (grade "Gêneros": 5 critérios, níveis 0–4, nota = soma × 0,5).

- `src/domain/` regras puras (grade, etapas) com testes
- `supabase/migrations/` esquema, RLS por perfil e auditoria
- Configure `.env` a partir de `.env.example`

```
npm install && npm run dev
npm run lint && npm test && npm run build
```

## Primeiro acesso (coordenação)
1. No painel do Supabase → Authentication → Users → *Add user* (e-mail + senha).
2. No SQL Editor: `insert into perfis(id,tipo,nome) values ('<uuid do usuário>','coordenacao','Seu nome');`
3. Entre no app; os demais perfis são cadastrados da mesma forma.

## Testes de tela
`npm run build && npx vite preview --port 4173 &` e depois `node e2e/fluxo.cjs` (Supabase simulado; requer Playwright instalado globalmente).

## Publicação (Vercel)
Importe o repositório na Vercel (framework Vite, `npm run build`, saída `dist`) e defina as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores em `.env.example`; a chave é pública, a proteção é a RLS).
