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
- [x] Login real: corretor (e-mail), aluno (matrícula), coordenação e professor (Área restrita)
- [x] Corretor: pacotes, fotos, correção gravada (níveis, comentário, marcações, anulação, tempo gasto); liberação automática das correções comuns; 2ª versão com a 1ª para comparar; dúvidas e suspeita de IA retidas; financeiro; retorno do professor
- [x] Aluno: propostas, envio de foto, avisos de atraso/ausência, prazo individual, correção liberada (texto do corretor, marcações, foto), boletim com bimestres e critérios
- [x] Coordenação: acessos, entregas, turmas, demandas (aceitar/recusar), corretores (pacotes, distribuição, desempenho), propostas e bimestres, pessoas (alunos com acesso por matrícula, equipe, senhas), regras, histórico, comunicados
- [x] Professor: visão geral, fila de liberação (foto e marcações reais; aprovar/modificar/zerar/responder dúvida), médias
- [~] Ganchos (calibração): definição e nota do professor gravam (nas `regras`); falta o gancho aparecer com a foto real dentro do pacote do corretor e a comparação professor × corretor (precisa de SQL, em `supabase/pendente.sql`)
- [x] Entregas → "Ver redação" mostra a foto real do aluno
- [x] Relatórios impressos das correções (turma e aluno) com níveis, comentários, marcações, foto e corretor reais
- [~] Contestação do aluno: código pronto, depende da tabela `contestacoes` (em `supabase/pendente.sql`)
- [ ] Notificações por e-mail
- [x] Pacotes: criados automaticamente (turma + proposta + versão, prazo vencido) quando a coordenação abre o sistema; distribuição gravada

### Testes
- `node e2e/smoke.cjs` (com `npx vite preview --port 4173` rodando): entra com os 4 perfis e abre todas as telas.
- `node e2e/ciclo-real.mjs`: ciclo aluno → corretor → coordenação no banco real (limpa o que cria).
- `node e2e/pessoas-real.mjs <matrícula>`: coordenação redefine a senha de um aluno e ele entra.

## Publicação (Vercel)
Importe o repositório na Vercel (framework Other, comando `npm run build`, saída `dist`) e defina as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores em `.env.example`; a chave é pública, a proteção é a RLS).

Ciclo completo contra o banco real (usa os usuários de teste): `NODE_USE_ENV_PROXY=1 node e2e/ciclo-real.mjs`.

## Estado da ligação protótipo ↔ banco
- [x] Login real: corretor (e-mail), aluno (matrícula), coordenação e professor (Área restrita)
- [x] Corretor: pacotes, fotos, correção gravada (níveis, comentário, marcações, anulação); liberação automática das correções comuns
- [x] Aluno: propostas, envio de foto, avisos de atraso/ausência, correção liberada com a foto
- [x] Coordenação (leitura): acessos, entregas, turmas, demandas, corretores, propostas, pessoas, regras, histórico
- [x] Coordenação (gravação por sincronização): aceitar/recusar demandas, atribuir pacotes, propostas, regras, histórico, cadastro de alunos/equipe/senhas
- [x] Professor: visão geral, fila de liberação (foto e marcações reais), médias; aprovar grava no banco
- [ ] Corretor: financeiro ("Quanto você recebe") e "Retorno do professor" (ocultos até serem ligados)
- [ ] Aluno: boletim (aviso provisório), texto do corretor palavra por palavra, contestação
- [ ] Ganchos (calibração), 2ª versão (reescrita/diagnóstico), dúvidas e suspeita de IA do corretor → professor
- [ ] Comunicado extraordinário (impressão e registro), relatórios com dados reais

## SQL
Tudo que já foi aplicado ao banco está em `supabase/migrations/`. O que ainda **não** foi aplicado fica em
`supabase/pendente.sql`. Ao final do trabalho será gerado um script único e completo: `supabase/schema-completo.sql`.
