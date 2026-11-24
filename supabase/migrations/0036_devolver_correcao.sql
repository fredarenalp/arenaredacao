-- A coordenação pode DEVOLVER uma correção (ou o pacote inteiro) ao corretor antes de liberar.
-- A correção continua salva (o corretor vê as próprias marcações e níveis), mas fica marcada em correcoes.extras.devolvida
-- ({ motivo, em, por }) e deixa de contar como "corrigida"/pronta para liberar. Quando o corretor salva de novo, o extras é refeito
-- sem a marca (volta ao fluxo normal). Só a coordenação devolve; correção já liberada ao aluno não é devolvida.

create or replace function public.devolver_redacao(p_redacao bigint, p_motivo text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação devolve correções'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Escreva o que falta corrigir'; end if;
  update public.correcoes c
     set extras = coalesce(c.extras, '{}'::jsonb) || jsonb_build_object('devolvida', jsonb_build_object('motivo', btrim(p_motivo), 'em', now(), 'por', auth.uid()))
   where c.redacao_id = p_redacao and not c.liberada;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.devolver_pacote(p_pacote bigint, p_motivo text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação devolve correções'; end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Escreva o que falta corrigir'; end if;
  update public.correcoes c
     set extras = coalesce(c.extras, '{}'::jsonb) || jsonb_build_object('devolvida', jsonb_build_object('motivo', btrim(p_motivo), 'em', now(), 'por', auth.uid()))
    from public.redacoes r
   where r.id = c.redacao_id and r.pacote_id = p_pacote and not c.liberada
     and (c.n1 is not null or c.anulacao is not null);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.devolver_redacao(bigint, text), public.devolver_pacote(bigint, text) from public, anon;
grant execute on function public.devolver_redacao(bigint, text), public.devolver_pacote(bigint, text) to authenticated;

-- liberar_pacote ignora correções devolvidas
create or replace function public.liberar_pacote(p_pacote bigint) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação libera pacotes'; end if;
  update public.pacotes set liberado_em = coalesce(liberado_em, now()), liberado_por = auth.uid() where id = p_pacote;
  update public.correcoes c set liberada = true
    from public.redacoes r
   where r.id = c.redacao_id and r.pacote_id = p_pacote and not c.liberada
     and c.n1 is not null and c.anulacao is null
     and coalesce(c.n1,0)+coalesce(c.n2,0)+coalesce(c.n3,0)+coalesce(c.n4,0)+coalesce(c.n5,0) between 1 and 19
     and not exists (select 1 from public.alunos_aee a where a.aluno_id = r.aluno_id)
     and not coalesce((c.extras->>'retida')::boolean, false)
     and (c.extras->'devolvida') is null;
  get diagnostics n = row_count;
  return n;
end $$;
