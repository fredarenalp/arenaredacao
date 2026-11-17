alter table public.avisos add column destino uuid references public.perfis(id);
create index on public.avisos (destino);
create index on public.avisos (decidido_por);

create table public.regras (
  chave text primary key,
  valor jsonb not null,
  atualizada_em timestamptz not null default now(),
  atualizada_por uuid references public.perfis(id)
);
alter table public.regras enable row level security;
create policy regras_le on public.regras for select to authenticated using (true);
create policy regras_coord on public.regras for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
create index on public.regras (atualizada_por);
