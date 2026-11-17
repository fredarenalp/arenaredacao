-- A política antiga consultava a própria tabela via função e não enxergava a linha recém-inserida
-- (INSERT ... RETURNING falhava para o aluno). Agora avalia a linha diretamente.
drop policy redacoes_leitura on public.redacoes;
create policy redacoes_leitura on public.redacoes for select to authenticated
  using (
    aluno_id = public.meu_aluno_id()
    or public.meu_tipo() in ('corretor','coordenacao')
    or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  );
