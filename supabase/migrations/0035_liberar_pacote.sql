-- A correção salva pelo corretor NÃO vai mais direto ao aluno: a coordenação clica em "Liberar pacote".
-- Notas 0 e 10, anuladas, AEE e dúvida pendente seguem outro processo (aprovação do professor).
alter table public.pacotes add column liberado_em timestamptz, add column liberado_por uuid references public.perfis(id);

create or replace function public.trg_correcoes() returns trigger
language plpgsql security definer set search_path = public as $$
declare soma int; retida boolean; eh_aee boolean; pac_lib boolean;
begin
  soma := coalesce(new.n1,0)+coalesce(new.n2,0)+coalesce(new.n3,0)+coalesce(new.n4,0)+coalesce(new.n5,0);
  select exists (select 1 from public.redacoes r join public.alunos_aee a on a.aluno_id = r.aluno_id where r.id = new.redacao_id) into eh_aee;
  retida := new.anulacao is not null or soma = 0 or soma = 20 or eh_aee or coalesce((new.extras->>'retida')::boolean, false);
  if public.meu_tipo() = 'corretor' then
    -- o corretor nunca libera: só continua liberada se o pacote já foi liberado pela coordenação e a nota não é retida
    select (p.liberado_em is not null) into pac_lib from public.redacoes r join public.pacotes p on p.id = r.pacote_id where r.id = new.redacao_id;
    if tg_op = 'INSERT' then new.liberada := coalesce(pac_lib, false) and not retida;
    else new.liberada := (old.liberada or coalesce(pac_lib, false)) and not retida; end if;
    if new.liberada and (tg_op = 'INSERT' or not old.liberada) then new.liberada_em := now(); end if;
  elsif new.liberada and (tg_op = 'INSERT' or not old.liberada) then
    if public.meu_tipo() not in ('coordenacao','professor') then
      raise exception 'Esta correção só pode ser liberada pela coordenação ou pelo professor';
    end if;
    new.liberada_em := now();
  end if;
  new.atualizada_em = now();
  if tg_op = 'UPDATE' and (new.n1,new.n2,new.n3,new.n4,new.n5) is distinct from (old.n1,old.n2,old.n3,old.n4,old.n5) then
    insert into public.eventos (redacao_id, autor, acao, anterior, novo)
    values (new.redacao_id, auth.uid(), 'nota_alterada',
      jsonb_build_object('niveis', array[old.n1,old.n2,old.n3,old.n4,old.n5], 'nota', old.nota),
      jsonb_build_object('niveis', array[new.n1,new.n2,new.n3,new.n4,new.n5]));
  end if;
  return new;
end $$;
revoke execute on function public.trg_correcoes() from public, anon, authenticated;

create function public.liberar_pacote(p_pacote bigint) returns int
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
     and not coalesce((c.extras->>'retida')::boolean, false);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.liberar_pacote(bigint) from public, anon;
grant execute on function public.liberar_pacote(bigint) to authenticated;

-- pacotes que já tinham correções liberadas continuam liberados (dados atuais)
update public.pacotes p set liberado_em = now()
 where exists (select 1 from public.redacoes r join public.correcoes c on c.redacao_id = r.id where r.pacote_id = p.id and c.liberada);
