create table public.retornos (
  id bigint generated always as identity primary key,
  corretor_id uuid not null references public.perfis(id) on delete cascade,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  resultado text not null check (resultado in ('aprovada','modificada','duvida','ia')),
  antes smallint[],
  depois smallint[],
  resposta text,
  visto boolean not null default false,
  entendido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.retornos (corretor_id);
create index on public.retornos (redacao_id);
alter table public.retornos enable row level security;
create policy retornos_corretor_le on public.retornos for select to authenticated
  using (corretor_id = (select auth.uid()) or public.meu_tipo() in ('coordenacao','professor'));
create policy retornos_corretor_marca on public.retornos for update to authenticated
  using (corretor_id = (select auth.uid())) with check (corretor_id = (select auth.uid()));
create policy retornos_decisor_cria on public.retornos for insert to authenticated
  with check (public.meu_tipo() in ('coordenacao','professor'));
