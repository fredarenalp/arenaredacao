-- professor enxerga e decide as correções retidas dos alunos das turmas dele
create or replace function public.professor_ve_redacao(r bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.redacoes x where x.id = r and public.professor_ve_aluno(x.aluno_id))
$$;
revoke execute on function public.professor_ve_redacao(bigint) from public, anon;

create policy correcoes_professor_le on public.correcoes for select to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy correcoes_professor_decide on public.correcoes for update to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy marcacoes_professor_le on public.marcacoes for select to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy marcacoes_professor_grava on public.marcacoes for all to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy redacoes_professor_atualiza on public.redacoes for update to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id));
drop policy eventos_insere on public.eventos;
create policy eventos_insere on public.eventos for insert to authenticated
  with check (public.meu_tipo() in ('corretor','coordenacao','professor') and autor = (select auth.uid()));
create policy eventos_professor_le on public.eventos for select to authenticated
  using (public.meu_tipo() = 'professor');
create policy fotos_professor_le on storage.objects for select to authenticated
  using (bucket_id = 'redacoes' and public.meu_tipo() = 'professor');
create policy comunicados_professor_le on public.comunicados for select to authenticated
  using (public.meu_tipo() = 'professor');
