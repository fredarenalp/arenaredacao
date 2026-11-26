-- Destaques saiu do app: remove tabela (0 linhas), funções do feed e a coluna de autorização da família.
drop function if exists public.feed_destaques(text);
drop function if exists public.feed_erros_serie();
drop function if exists public.feed_serie();
drop function if exists public.responder_destaque(bigint, boolean);
drop table if exists public.destaques cascade;
alter table public.alunos drop column if exists autoriza_destaque;

-- Corretor lê só o próprio perfil; professor e coordenação continuam lendo todos.
-- Para o corretor ver apenas o NOME COMPLETO de outras pessoas existe a visão nomes_perfis (id, nome), sem e-mail.
drop policy if exists perfis_leitura on public.perfis;
create policy perfis_leitura on public.perfis for select to authenticated
  using (id = auth.uid() or public.meu_tipo() in ('professor','coordenacao'));
create or replace view public.nomes_perfis as
  select id, nome from public.perfis
  where public.meu_tipo() in ('corretor','professor','coordenacao');
grant select on public.nomes_perfis to authenticated;
