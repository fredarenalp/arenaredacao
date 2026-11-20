-- Dicionário de conectivos do Assistente de correção (por função). O conteúdo é do material da escola e fica só no banco
-- (carregado direto no Supabase, não vem no repositório público).
create table public.conectivos (
  funcao text not null,
  texto text not null,
  ordem int not null default 0,
  primary key (funcao, texto)
);
alter table public.conectivos enable row level security;
create policy conectivos_le on public.conectivos for select to authenticated
  using ((select public.meu_tipo()) in ('coordenacao','professor','corretor'));
create policy conectivos_coord on public.conectivos for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
