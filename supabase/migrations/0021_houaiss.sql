-- Dicionário de sinônimos por sentido (Houaiss), consultado pelo corretor ao marcar "repetição de palavra".
-- O conteúdo NÃO fica no repositório (público): carregado por scripts/semear-houaiss.mjs.
create table public.sinonimos_verbetes (
  id int primary key,
  palavra text not null,
  variantes text[] not null,
  norm text[] not null,            -- palavra-título (e variantes) sem acento, minúscula: chave da busca
  sentidos jsonb not null          -- [{ "glosa": "expor", "sin": ["apresentar","exibir"] }, ...]
);
create index sinonimos_verbetes_norm_idx on public.sinonimos_verbetes using gin (norm);
alter table public.sinonimos_verbetes enable row level security;
create policy sinverb_le on public.sinonimos_verbetes for select to authenticated
  using (public.meu_tipo() in ('coordenacao','professor','corretor'));
create policy sinverb_coord on public.sinonimos_verbetes for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
