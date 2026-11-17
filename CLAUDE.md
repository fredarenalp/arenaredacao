# Arena Redação — instruções do projeto

## Regras do dono do projeto (valem sempre)
1. **O protótipo é a referência absoluta.** `prototipo/app.html` É o app; `prototipo/prototipo-v144-original.html`
   é a cópia congelada. Não recriar telas à mão nem "se inspirar": o visual e o comportamento devem ficar idênticos.
   O trabalho é trocar os dados de exemplo por dados reais do Supabase, área por área, via `src/ponte.js` (`window.ARENA`).
2. **Supabase: acesso autorizado sempre, inclusive `execute_sql`.** O dono liberou o uso das ferramentas do Supabase (projeto
   `nklkchelknnvovoilybc`, "Arena Redação") sem pedir permissão: consultas, migrations, funções edge e usuários de teste.
   Não perguntar antes. (Continua valendo cuidado: nada destrutivo fora dos dados de teste e nada de segredos no repositório.)
3. Não criar pull request, a menos que o dono peça. Desenvolver na branch `claude/great-albattani-415kor`.
4. Dados reais de alunos nunca vão para o repositório (ele é público).
5. Usuários de teste (senha `teste`): `teste@arena.com` (coordenação), `corretor@arena.com`, aluno pela matrícula `20260187`.

## Como trabalhar
- Lint/testes/build: `npm run lint && npm test && npm run build`.
- Ciclo de dados no banco real: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node e2e/ciclo-real.mjs`.
- Estado da ligação protótipo ↔ banco: ver o final do `README.md`.
