create table public.comunicados (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  redacao_id bigint references public.redacoes(id) on delete set null,
  texto text not null check (length(texto) between 1 and 2000),
  criado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);
alter table public.comunicados enable row level security;
create policy comunicados_coord on public.comunicados for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao' and criado_por = auth.uid());
create policy comunicados_aluno_le on public.comunicados for select to authenticated
  using (aluno_id = public.meu_aluno_id());
create policy comunicados_aluno_marca on public.comunicados for update to authenticated
  using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create index on public.comunicados (aluno_id);
