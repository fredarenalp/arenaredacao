-- "Pedir uma conversa": pedidos de plantão de redação feitos pelo aluno; a coordenação combina o horário.
create table public.plantoes (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  proposta_id bigint references public.propostas(id),
  texto text,
  status text not null default 'pend' check (status in ('pend','agendado','atendido')),
  horario text,
  criado_em timestamptz not null default now(),
  tratado_por uuid references public.perfis(id),
  tratado_em timestamptz
);
create index on public.plantoes (aluno_id);
create index on public.plantoes (status);
alter table public.plantoes enable row level security;
create policy plantoes_aluno_le on public.plantoes for select to authenticated
  using (aluno_id = (select public.meu_aluno_id()) or (select public.meu_tipo()) in ('coordenacao','professor'));
create policy plantoes_aluno_cria on public.plantoes for insert to authenticated
  with check (aluno_id = (select public.meu_aluno_id()) and status = 'pend');
create policy plantoes_coord on public.plantoes for update to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
