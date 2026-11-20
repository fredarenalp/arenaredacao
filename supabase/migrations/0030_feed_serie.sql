-- Gráficos da série para o feed do aluno: média por critério e distribuição das notas (só agregados; some com menos de 5 correções).
create function public.feed_serie() returns table (n bigint, crit numeric[], faixas bigint[])
language plpgsql stable security definer set search_path = public as $$
declare s text;
begin
  select t.serie into s from alunos a join turmas t on t.id = a.turma_id where a.id = meu_aluno_id();
  if s is null then return; end if;
  return query
    select count(*)::bigint,
           array[round(avg(c.n1),1), round(avg(c.n2),1), round(avg(c.n3),1), round(avg(c.n4),1), round(avg(c.n5),1)],
           array[count(*) filter (where c.nota < 6), count(*) filter (where c.nota >= 6 and c.nota < 9), count(*) filter (where c.nota >= 9)]::bigint[]
      from correcoes c join redacoes r on r.id = c.redacao_id
      join alunos a on a.id = r.aluno_id join turmas t on t.id = a.turma_id
     where c.liberada and c.anulacao is null and t.serie = s
    having count(*) >= 5;
end $$;
revoke execute on function public.feed_serie() from public, anon;
grant execute on function public.feed_serie() to authenticated;
