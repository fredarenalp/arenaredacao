-- SQL pendente (ainda NÃO aplicado ao banco). Será consolidado em supabase/schema-completo.sql ao final.

-- 1) O professor precisa gravar os ganchos que corrige (hoje só a coordenação escreve em regras).
create policy regras_professor_ganchos on public.regras for all to authenticated
  using (public.meu_tipo() = 'professor' and chave = 'ganchos')
  with check (public.meu_tipo() = 'professor' and chave = 'ganchos');
