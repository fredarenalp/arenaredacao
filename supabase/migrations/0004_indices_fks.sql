create index if not exists alunos_turma_id_idx on public.alunos (turma_id);
create index if not exists comunicados_criado_por_idx on public.comunicados (criado_por);
create index if not exists comunicados_redacao_id_idx on public.comunicados (redacao_id);
create index if not exists eventos_autor_idx on public.eventos (autor);
create index if not exists eventos_redacao_id_idx on public.eventos (redacao_id);
create index if not exists professor_turmas_turma_id_idx on public.professor_turmas (turma_id);
create index if not exists redacoes_corretor_id_idx on public.redacoes (corretor_id);
create index if not exists redacoes_proposta_id_idx on public.redacoes (proposta_id);
