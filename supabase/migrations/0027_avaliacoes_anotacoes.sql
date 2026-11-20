-- Estrelas (1 a 3) e comentário do aluno sobre a correção; anotação privada do aluno.
create table public.avaliacoes_correcao (
  id bigint generated always as identity primary key,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  estrelas smallint not null check (estrelas between 1 and 3),
  ajudou text[] not null default '{}',
  comentario text check (char_length(comentario) <= 500),
  oculto boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (redacao_id)
);
create index on public.avaliacoes_correcao (aluno_id);
alter table public.avaliacoes_correcao enable row level security;
create policy aval_aluno_le on public.avaliacoes_correcao for select to authenticated
  using (aluno_id = (select public.meu_aluno_id()));
create policy aval_aluno_cria on public.avaliacoes_correcao for insert to authenticated
  with check (aluno_id = (select public.meu_aluno_id()) and oculto = false and exists (
    select 1 from public.redacoes r join public.correcoes c on c.redacao_id = r.id
    where r.id = redacao_id and r.aluno_id = (select public.meu_aluno_id()) and c.liberada));
create policy aval_coord on public.avaliacoes_correcao for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
create policy aval_prof_le on public.avaliacoes_correcao for select to authenticated
  using ((select public.meu_tipo()) = 'professor' and not oculto and public.professor_ve_aluno(aluno_id));

create table public.anotacoes_aluno (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  texto text not null check (char_length(texto) <= 2000),
  atualizada_em timestamptz not null default now(),
  unique (aluno_id, redacao_id)
);
alter table public.anotacoes_aluno enable row level security;
create policy anot_aluno on public.anotacoes_aluno for all to authenticated
  using (aluno_id = (select public.meu_aluno_id())) with check (aluno_id = (select public.meu_aluno_id()));
