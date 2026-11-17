# Arena Redação

Sistema de correção de redações (grade "Gêneros": 5 critérios, níveis 0–4, nota = soma × 0,5).

- `src/domain/` regras puras (grade, etapas) com testes
- `supabase/migrations/` esquema, RLS por perfil e auditoria
- Configure `.env` a partir de `.env.example`

```
npm install && npm run dev
npm run lint && npm test && npm run build
```
