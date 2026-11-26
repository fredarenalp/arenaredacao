-- Feriados (a coordenação edita em Ajustes → Regras) e o fim do envio com atraso.
create table if not exists public.feriados (data date primary key, nome text not null);
alter table public.feriados enable row level security;
drop policy if exists feriados_leitura on public.feriados;
create policy feriados_leitura on public.feriados for select to authenticated using (true);
drop policy if exists feriados_coord on public.feriados;
create policy feriados_coord on public.feriados for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
insert into public.feriados (data, nome) values
  ('2026-01-01','Confraternização Universal'),('2026-02-16','Carnaval'),('2026-02-17','Carnaval'),
  ('2026-04-03','Sexta-feira Santa'),('2026-04-21','Tiradentes'),('2026-05-01','Dia do Trabalho'),
  ('2026-06-04','Corpus Christi'),('2026-09-07','Independência do Brasil'),('2026-10-12','Nossa Senhora Aparecida'),
  ('2026-10-24','Aniversário de Goiânia'),('2026-11-02','Finados'),('2026-11-15','Proclamação da República'),
  ('2026-11-20','Consciência Negra'),('2026-12-25','Natal')
on conflict (data) do nothing;

-- REGRA DO DONO: o envio com atraso vai até a SEXTA-FEIRA da semana do prazo; se for feriado, vale o dia útil anterior.
create or replace function public.fim_atraso(p_prazo date) returns date
language plpgsql stable set search_path = public as $$
declare d date;
begin
  if p_prazo is null then return null; end if;
  d := p_prazo + ((5 - extract(isodow from p_prazo)::int + 7) % 7);
  while extract(isodow from d)::int > 5 or exists (select 1 from public.feriados f where f.data = d) loop d := d - 1; end loop;
  return greatest(d, p_prazo);
end $$;
grant execute on function public.fim_atraso(date) to authenticated;

-- Trava de envio do aluno: proposta aberta (ou liberada para ele), da série dele e dentro do prazo + atraso.
create or replace function public.trg_redacao_envio() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr date; pr_v date; ate date; liberada boolean; st text; sers int[]; serie_aluno int; hoje date; indiv boolean;
begin
  if public.meu_tipo() = 'aluno' then
    hoje := (now() at time zone 'America/Sao_Paulo')::date;
    select prazo, case when new.versao = 2 then prazo2 else prazo end, status, series into pr, pr_v, st, sers from public.propostas where id = new.proposta_id;
    if st is null then raise exception 'Proposta não encontrada'; end if;
    select p.ate into ate from public.prazos_individuais p where p.aluno_id = new.aluno_id and p.proposta_id = new.proposta_id;
    indiv := (ate is not null and ate >= hoje);
    if st in ('rascunho','encerrada') then raise exception 'Esta proposta não recebe mais envios'; end if;
    if not indiv then
      if st = 'fechada' then raise exception 'Envio fechado: procure a coordenação'; end if;
      if pr_v is not null and hoje > public.fim_atraso(pr_v) then raise exception 'O prazo de envio terminou: procure a coordenação'; end if;
    end if;
    select t.serie into serie_aluno from public.alunos a join public.turmas t on t.id = a.turma_id where a.id = new.aluno_id;
    if sers is not null and array_length(sers,1) > 0 and serie_aluno is not null and not (serie_aluno = any(sers)) then
      raise exception 'Esta proposta não é da sua série';
    end if;
    new.fora_do_prazo := (pr is not null and pr < hoje and not indiv);
    new.enviada_em := now();
    if new.versao = 2 then
      select coalesce(bool_or(c.liberada), false) into liberada
        from public.redacoes r join public.correcoes c on c.redacao_id = r.id
        where r.aluno_id = new.aluno_id and r.proposta_id = new.proposta_id and r.versao = 1;
      if not liberada then raise exception 'A reescrita só abre depois que a 1ª versão for corrigida e liberada'; end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.trg_redacao_envio() from public, anon, authenticated;
-- (dado de teste) Propostas 1 e 4 do 4º bimestre reabertas: update public.propostas set status = 'aberta' where id in (3, 46);
