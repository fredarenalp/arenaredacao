-- AEE: marca sigilosa do aluno, corretor especialista, pacote próprio e correção retida para o professor liberar.
create table public.alunos_aee (
  aluno_id bigint primary key references public.alunos(id) on delete cascade,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);
create index on public.alunos_aee (criado_por);
alter table public.alunos_aee enable row level security;
create policy aee_coord on public.alunos_aee for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
create policy aee_professor_le on public.alunos_aee for select to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id));
create policy aee_corretor_le on public.alunos_aee for select to authenticated
  using (public.meu_tipo() = 'corretor' and exists (
    select 1 from public.redacoes r join public.pacotes p on p.id = r.pacote_id
    where r.aluno_id = alunos_aee.aluno_id and p.corretor_id = (select auth.uid())));

alter table public.perfis add column especialista_aee boolean not null default false;
alter table public.pacotes add column aee boolean not null default false;

create or replace function public.trg_pacote_aee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.aee and new.corretor_id is not null
     and not exists (select 1 from public.perfis where id = new.corretor_id and especialista_aee) then
    raise exception 'Pacote AEE só pode ser atribuído a corretor especialista em AEE';
  end if;
  return new;
end $$;
revoke execute on function public.trg_pacote_aee() from public, anon, authenticated;
create trigger pacotes_aee_biu before insert or update on public.pacotes
  for each row execute function public.trg_pacote_aee();

create or replace function public.trg_correcoes() returns trigger
language plpgsql security definer set search_path = public as $$
declare soma int; retida boolean; eh_aee boolean;
begin
  soma := coalesce(new.n1,0)+coalesce(new.n2,0)+coalesce(new.n3,0)+coalesce(new.n4,0)+coalesce(new.n5,0);
  select exists (select 1 from public.redacoes r join public.alunos_aee a on a.aluno_id = r.aluno_id where r.id = new.redacao_id) into eh_aee;
  retida := new.anulacao is not null or soma = 0 or soma = 20 or eh_aee or coalesce((new.extras->>'retida')::boolean, false);
  if new.liberada and (tg_op = 'INSERT' or not old.liberada) then
    if public.meu_tipo() not in ('coordenacao','professor') and (retida or public.meu_tipo() <> 'corretor') then
      raise exception 'Esta correção só pode ser liberada pela coordenação ou pelo professor';
    end if;
    new.liberada_em = now();
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

create or replace function public.gerar_pacotes() returns int
language plpgsql security definer set search_path = public as $$
declare g record; novo bigint; n int := 0; num int; dias int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação gera pacotes'; end if;
  select coalesce((valor #>> '{}')::int, 5) into dias from public.regras where chave = 'devolve';
  dias := coalesce(dias, 5);
  for g in
    select (a2.aluno_id is not null) as aee,
           case when a2.aluno_id is not null then t.serie || 'º ano · AEE' else t.serie || 'º ano ' || t.nome end as rotulo_turma,
           r.proposta_id, r.versao, p.numero, p.genero, array_agg(r.id) as ids
    from public.redacoes r
    join public.alunos a on a.id = r.aluno_id
    join public.turmas t on t.id = a.turma_id
    join public.propostas p on p.id = r.proposta_id
    left join public.alunos_aee a2 on a2.aluno_id = a.id
    where r.pacote_id is null and r.etapa = 'enviada' and (p.prazo is null or p.prazo < current_date)
    group by (a2.aluno_id is not null),
             case when a2.aluno_id is not null then t.serie || 'º ano · AEE' else t.serie || 'º ano ' || t.nome end,
             r.proposta_id, r.versao, p.numero, p.genero
  loop
    select coalesce(max(numero), 0) + 1 into num from public.pacotes;
    insert into public.pacotes (numero, serie, proposta_id, rotulo, entrega, prazo, reescrita, aee)
    values (num, g.rotulo_turma, g.proposta_id,
            case when g.versao = 2 then '2ª versão (reescrita)' else '1ª versão' end || ' · Proposta ' || g.numero || ' · ' || g.genero,
            current_date, current_date + dias, g.versao = 2, g.aee)
    returning id into novo;
    update public.redacoes set pacote_id = novo where id = any (g.ids);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.gerar_pacotes() from public, anon;
grant execute on function public.gerar_pacotes() to authenticated;
