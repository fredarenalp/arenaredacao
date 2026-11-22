-- Mini explicação de cada função de conectivo (mostrada no AC ao escolher a função). Conteúdo só no banco.
create table public.conectivos_funcoes (
  funcao text primary key,
  descricao text not null
);
alter table public.conectivos_funcoes enable row level security;
create policy conectivos_funcoes_le on public.conectivos_funcoes for select to authenticated
  using ((select public.meu_tipo()) in ('coordenacao','professor','corretor'));
create policy conectivos_funcoes_coord on public.conectivos_funcoes for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
