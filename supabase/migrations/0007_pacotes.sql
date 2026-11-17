create table public.pacotes (
  id bigint generated always as identity primary key,
  numero int not null unique,
  serie text not null,
  proposta_id bigint references public.propostas(id),
  rotulo text not null,
  entrega date,
  prazo date,
  reescrita boolean not null default false,
  atrasadas boolean not null default false,
  corretor_id uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);
create index on public.pacotes (corretor_id);
create index on public.pacotes (proposta_id);
alter table public.pacotes enable row level security;
create policy pacotes_corretor_le on public.pacotes for select to authenticated
  using (corretor_id = (select auth.uid()) or public.meu_tipo() in ('coordenacao','professor'));
create policy pacotes_coord on public.pacotes for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

alter table public.redacoes add column pacote_id bigint references public.pacotes(id) on delete set null;
alter table public.redacoes add column obs text;
create index on public.redacoes (pacote_id);

drop policy redacoes_leitura on public.redacoes;
create policy redacoes_leitura on public.redacoes for select to authenticated
  using (
    aluno_id = public.meu_aluno_id()
    or public.meu_tipo() = 'coordenacao'
    or (public.meu_tipo() = 'corretor' and (pacote_id is null or exists (select 1 from public.pacotes p where p.id = pacote_id and p.corretor_id = (select auth.uid()))))
    or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  );
