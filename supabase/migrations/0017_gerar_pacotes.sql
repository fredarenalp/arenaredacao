-- Agrupa as redações enviadas (com prazo vencido) em um pacote por turma + proposta + versão.
create or replace function public.gerar_pacotes() returns int
language plpgsql security definer set search_path = public as $$
declare g record; novo bigint; n int := 0; num int; dias int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação gera pacotes'; end if;
  select coalesce((valor #>> '{}')::int, 5) into dias from public.regras where chave = 'devolve';
  dias := coalesce(dias, 5);
  for g in
    select a.turma_id, r.proposta_id, r.versao, t.serie, t.nome as turma, p.numero, p.genero, array_agg(r.id) as ids
    from public.redacoes r
    join public.alunos a on a.id = r.aluno_id
    join public.turmas t on t.id = a.turma_id
    join public.propostas p on p.id = r.proposta_id
    where r.pacote_id is null and r.etapa = 'enviada' and (p.prazo is null or p.prazo < current_date)
    group by a.turma_id, r.proposta_id, r.versao, t.serie, t.nome, p.numero, p.genero
  loop
    select coalesce(max(numero), 0) + 1 into num from public.pacotes;
    insert into public.pacotes (numero, serie, proposta_id, rotulo, entrega, prazo, reescrita)
    values (num, g.serie || 'º ano ' || g.turma, g.proposta_id,
            case when g.versao = 2 then '2ª versão (reescrita)' else '1ª versão' end || ' · Proposta ' || g.numero || ' · ' || g.genero,
            current_date, current_date + dias, g.versao = 2)
    returning id into novo;
    update public.redacoes set pacote_id = novo where id = any (g.ids);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.gerar_pacotes() from public, anon;
grant execute on function public.gerar_pacotes() to authenticated;
