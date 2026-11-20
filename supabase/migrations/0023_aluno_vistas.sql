-- O aluno "viu" a correção: usado pela primeira tela (só comemora/avisa correção ainda não vista).
alter table public.correcoes add column vista_em timestamptz;
create or replace function public.aluno_marca_vista(p_redacao bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.correcoes c set vista_em = coalesce(c.vista_em, now())
  where c.redacao_id = p_redacao
    and exists (select 1 from public.redacoes r where r.id = p_redacao and r.aluno_id = public.meu_aluno_id());
end $$;
revoke execute on function public.aluno_marca_vista(bigint) from public, anon;
grant execute on function public.aluno_marca_vista(bigint) to authenticated;
