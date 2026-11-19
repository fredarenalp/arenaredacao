-- Dicionário de sinônimos (consulta do corretor ao marcar "repetição de palavra").
-- O conteúdo NÃO fica no repositório (público): é carregado por scripts/semear-sinonimos.mjs a partir dos PDFs.
create table public.sinonimos_grupos (
  id int primary key,
  sentidos jsonb not null,          -- [["copiar","trasladar"],["colar","plagiar"]]  (um array por sentido)
  palavras text[] not null,         -- todas as palavras do verbete
  norm text[] not null              -- as mesmas, sem acento e minúsculas, para a busca
);
create index sinonimos_grupos_norm_idx on public.sinonimos_grupos using gin (norm);
alter table public.sinonimos_grupos enable row level security;
create policy sinonimos_le on public.sinonimos_grupos for select to authenticated
  using (public.meu_tipo() in ('coordenacao','professor','corretor'));
create policy sinonimos_coord on public.sinonimos_grupos for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
