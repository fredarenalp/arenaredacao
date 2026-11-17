create table public.prazos_individuais (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  proposta_id bigint not null references public.propostas(id) on delete cascade,
  ate date not null,
  vale_nota boolean not null default true,
  motivo text,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now(),
  unique (aluno_id, proposta_id)
);
create index on public.prazos_individuais (proposta_id);
create index on public.prazos_individuais (criado_por);
alter table public.prazos_individuais enable row level security;
create policy prazos_aluno_le on public.prazos_individuais for select to authenticated
  using (aluno_id = public.meu_aluno_id() or public.meu_tipo() in ('coordenacao','professor'));
create policy prazos_coord on public.prazos_individuais for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
