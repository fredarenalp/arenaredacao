create table public.acessos (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  aluno_id bigint references public.alunos(id) on delete cascade,
  em timestamptz not null default now()
);
create index on public.acessos (perfil_id);
create index on public.acessos (aluno_id);
create index on public.acessos (em desc);
alter table public.acessos enable row level security;
create policy acessos_registra on public.acessos for insert to authenticated
  with check (perfil_id = (select auth.uid()));
create policy acessos_le on public.acessos for select to authenticated
  using (public.meu_tipo() in ('coordenacao','professor') or perfil_id = (select auth.uid()));
