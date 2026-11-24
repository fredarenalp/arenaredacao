-- A coordenação pode cancelar uma devolução (a correção volta a contar como pronta, sem o recado).
create or replace function public.cancelar_devolucao(p_redacao bigint) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação cancela devoluções'; end if;
  update public.correcoes c set extras = c.extras - 'devolvida' where c.redacao_id = p_redacao and (c.extras->'devolvida') is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.cancelar_devolucao(bigint) from public, anon;
grant execute on function public.cancelar_devolucao(bigint) to authenticated;
