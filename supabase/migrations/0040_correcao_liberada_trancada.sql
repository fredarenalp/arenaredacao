-- Depois que a correção é liberada ao aluno, o corretor não pode mais alterá-la (nem a nota, nem as marcações).
-- Antes da liberação ele continua podendo salvar de novo. Coordenação e professor não são afetados.
create or replace function public.trg_correcoes() returns trigger
language plpgsql security definer set search_path = public as $$
declare soma int; retida boolean; eh_aee boolean; pac_lib boolean;
begin
  if tg_op = 'UPDATE' and old.liberada and public.meu_tipo() = 'corretor' then
    raise exception 'Esta correção já foi liberada ao aluno e não pode mais ser alterada pelo corretor';
  end if;
  soma := coalesce(new.n1,0)+coalesce(new.n2,0)+coalesce(new.n3,0)+coalesce(new.n4,0)+coalesce(new.n5,0);
  select exists (select 1 from public.redacoes r join public.alunos_aee a on a.aluno_id = r.aluno_id where r.id = new.redacao_id) into eh_aee;
  retida := new.anulacao is not null or soma = 0 or soma = 20 or eh_aee or coalesce((new.extras->>'retida')::boolean, false);
  if public.meu_tipo() = 'corretor' then
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

-- REGRA DO DONO: depois que a coordenação libera o pacote, o corretor não edita NADA nele (sem exceção):
-- nem salvar correção nova, nem alterar nota/marcações/comentários, nem apagar. Coordenação e professor não são afetados.
create or replace function public.trg_trava_liberada() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid bigint; j jsonb;
begin
  if public.meu_tipo() is distinct from 'corretor' then return coalesce(new, old); end if;
  -- lê o id por jsonb: a tabela correcoes não tem coluna "id" (a chave é redacao_id)
  j := to_jsonb(coalesce(new, old));
  rid := case when tg_table_name = 'redacoes' then (j->>'id')::bigint else (j->>'redacao_id')::bigint end;
  if exists (select 1 from public.redacoes r join public.pacotes p on p.id = r.pacote_id where r.id = rid and p.liberado_em is not null)
     or exists (select 1 from public.correcoes c where c.redacao_id = rid and c.liberada) then
    raise exception 'Este pacote já foi liberado ao aluno: o corretor não pode mais alterar a correção';
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.trg_trava_liberada() from public, anon, authenticated;
drop trigger if exists trava_liberada_del on public.correcoes;
drop trigger if exists trava_liberada_cor on public.correcoes;
create trigger trava_liberada_cor before insert or update or delete on public.correcoes for each row execute function public.trg_trava_liberada();
drop trigger if exists trava_liberada_marc on public.marcacoes;
create trigger trava_liberada_marc before insert or update or delete on public.marcacoes for each row execute function public.trg_trava_liberada();
drop trigger if exists trava_liberada_red on public.redacoes;
create trigger trava_liberada_red before update on public.redacoes for each row execute function public.trg_trava_liberada();
