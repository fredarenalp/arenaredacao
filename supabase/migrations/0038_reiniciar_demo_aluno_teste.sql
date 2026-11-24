-- Conta de teste do aluno (matrícula 20260187): a cada login a correção da Proposta 3 volta a aparecer como "nova, ainda não vista"
-- (zera correcoes.vista_em). Não mexe em liberada: a liberação continua sendo feita pela coordenação. Outros alunos não são afetados.
create or replace function public.reiniciar_demo_aluno_teste() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.correcoes c set vista_em = null
    from public.redacoes r
    join public.alunos a on a.id = r.aluno_id
    join public.propostas p on p.id = r.proposta_id
   where c.redacao_id = r.id and a.perfil_id = auth.uid() and a.matricula = '20260187' and p.numero = 3 and c.vista_em is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.reiniciar_demo_aluno_teste() from public, anon;
grant execute on function public.reiniciar_demo_aluno_teste() to authenticated;
