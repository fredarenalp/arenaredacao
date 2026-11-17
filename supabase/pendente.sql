-- SQL pendente (ainda NÃO aplicado ao banco). Será consolidado em supabase/schema-completo.sql ao final.

-- 1) O professor precisa gravar os ganchos que corrige (hoje só a coordenação escreve em regras).
create policy regras_professor_ganchos on public.regras for all to authenticated
  using (public.meu_tipo() = 'professor' and chave = 'ganchos')
  with check (public.meu_tipo() = 'professor' and chave = 'ganchos');

-- 2) Contestação da correção pelo aluno (uma por redação), decidida pelo professor/coordenação.
create table public.contestacoes (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  redacao_id bigint not null unique references public.redacoes(id) on delete cascade,
  criterios jsonb not null,
  orig smallint[] not null,
  novo smallint[],
  status text not null default 'pendente' check (status in ('pendente','recorrigida','mantida')),
  criado_em timestamptz not null default now(),
  decidido_por uuid references public.perfis(id),
  decidido_em timestamptz
);
create index on public.contestacoes (aluno_id);
create index on public.contestacoes (decidido_por);
alter table public.contestacoes enable row level security;
create policy contestacoes_aluno_le on public.contestacoes for select to authenticated
  using (aluno_id = public.meu_aluno_id() or public.meu_tipo() in ('coordenacao','professor'));
create policy contestacoes_aluno_cria on public.contestacoes for insert to authenticated
  with check (aluno_id = public.meu_aluno_id() and status = 'pendente');
create policy contestacoes_decide on public.contestacoes for update to authenticated
  using (public.meu_tipo() in ('coordenacao','professor')) with check (public.meu_tipo() in ('coordenacao','professor'));
