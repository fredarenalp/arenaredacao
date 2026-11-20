-- Lista de palavras do português do Brasil (formas flexionadas) para o autocompletar da Ortografia.
-- Fonte: dicionário VERO/LibreOffice (LGPL-3 / MPL-2). Conteúdo carregado por scripts/semear-palavras.mjs (não vai no repositório).
create table public.palavras_pt (
  palavra text primary key,
  norm text not null,                 -- sem acento, minúscula: chave da busca por prefixo
  comum boolean not null default false, -- aparece nos dicionários de sinônimos: sobe na lista
  tam smallint generated always as (length(palavra)) stored
);
create index palavras_pt_norm_idx on public.palavras_pt (norm text_pattern_ops);
alter table public.palavras_pt enable row level security;
create policy palavras_le on public.palavras_pt for select to authenticated
  using ((select public.meu_tipo()) in ('coordenacao','professor','corretor'));
create policy palavras_coord on public.palavras_pt for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
