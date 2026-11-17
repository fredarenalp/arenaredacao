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

## Como o app funciona
O app **é o protótipo** (`prototipo/app.html`, fonte única do visual e do comportamento). O Vite empacota só a
ponte com o Supabase (`src/ponte.js` → `dist/ponte.iife.js`) e `scripts/montar.mjs` gera `dist/index.html`.
Os dados de exemplo do protótipo estão sendo substituídos, área por área, por dados reais do banco.
`prototipo/prototipo-v144-original.html` é a cópia congelada da referência.

Ciclo de dados contra o banco real: `NODE_USE_ENV_PROXY=1 node e2e/ciclo-real.mjs`.

## Publicação (Vercel)
Importe o repositório na Vercel (framework Other, comando `npm run build`, saída `dist`) e defina as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores em `.env.example`; a chave é pública, a proteção é a RLS).

Ciclo completo contra o banco real (usa os usuários de teste): `NODE_USE_ENV_PROXY=1 node e2e/ciclo-real.mjs`.

## Estado da ligação protótipo ↔ banco
- [x] Login real (corretor por e-mail, aluno por matrícula, coordenação/professor pela "Área restrita")
- [x] Corretor: pacotes, redações, fotos (URL assinada) e correção salva no banco (níveis, comentário, marcações, anulação)
- [ ] Corretor: financeiro ("Quanto você recebe") e "Retorno do professor" — ocultos até serem ligados (eram números de exemplo)
- [ ] Corretor: fila do professor (dúvidas, suspeita de IA, notas 0/10), ganchos, 2ª versão
- [x] Aluno: lista de propostas/redações, envio de foto (upload real), correção liberada vista no visor do protótipo
- [ ] Aluno: boletim (placeholder até ser ligado), textos por critério = os escritos pelo corretor (hoje o visor recompõe a partir dos níveis), contestação, ausência/atraso (avisos)
- [ ] Coordenação: acessos, liberação, pacotes, avisos/comunicados, relatórios
- [ ] Professor: visão geral, fila, revisão
