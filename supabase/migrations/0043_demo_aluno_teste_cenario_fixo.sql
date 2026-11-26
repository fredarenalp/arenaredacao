-- Conta de demonstração (matrícula 20260187): a cada login, prazo individual até amanhã nas Propostas 1 e 2 do bimestre atual (só deste aluno).
create or replace function public.reiniciar_demo_aluno_teste() returns integer
language plpgsql security definer set search_path = public as $$
declare n int; aid bigint; hoje date := (now() at time zone 'America/Sao_Paulo')::date; bim int;
begin
  select a.id into aid from public.alunos a where a.perfil_id = auth.uid() and a.matricula = '20260187';
  if aid is null then return 0; end if;
  update public.correcoes c set vista_em = null
    from public.redacoes r join public.propostas p on p.id = r.proposta_id
   where c.redacao_id = r.id and r.aluno_id = aid and p.numero = 3 and c.vista_em is not null;
  get diagnostics n = row_count;
  select max(bimestre) into bim from public.propostas;
  insert into public.prazos_individuais (aluno_id, proposta_id, ate, vale_nota, motivo)
    select aid, p.id, hoje + 1, true, 'Demonstração'
    from public.propostas p where p.bimestre = bim and p.numero in (1, 2)
  on conflict (aluno_id, proposta_id) do update set ate = excluded.ate, vale_nota = true;
  return n;
end $$;
grant execute on function public.reiniciar_demo_aluno_teste() to authenticated;
update public.propostas set status = 'aberta' where bimestre = (select max(bimestre) from public.propostas) and numero = 2 and status = 'encerrada';
