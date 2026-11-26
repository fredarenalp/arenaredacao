-- PROPOSTO NA VARREDURA (NÃO APLICADO). Decisão do dono pendente.
-- Furo: hoje o banco deixa o aluno enviar redação em proposta 'rascunho', 'fechada' ou 'encerrada', e em proposta de outra série.
-- A tela do aluno (src/ponte.js carregarAluno) também ignora propostas.status e só olha datas.
-- Efeito esperado ao aplicar: "Fechar"/"Encerrar" na coordenação passam a valer para o aluno; rascunho some para o aluno.
-- ATENÇÃO: no banco de teste as 4 propostas do 4º bimestre estão 'encerrada' (a coordenação mostra "Encerrada", o aluno vê aberta).
-- Antes de aplicar: reabrir (Propostas → Reabrir) as que devem receber envios.
create or replace function public.trg_redacao_envio() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr date; ate date; liberada boolean; st text; sers int[]; serie_aluno int;
begin
  if public.meu_tipo() = 'aluno' then
    select prazo, status, series into pr, st, sers from public.propostas where id = new.proposta_id;
    if st is null then raise exception 'Proposta não encontrada'; end if;
    select p.ate into ate from public.prazos_individuais p where p.aluno_id = new.aluno_id and p.proposta_id = new.proposta_id;
    if st in ('rascunho','encerrada') then raise exception 'Esta proposta não recebe mais envios'; end if;
    if st = 'fechada' and (ate is null or ate < current_date) then raise exception 'Envio fechado: procure a coordenação'; end if;
    select t.serie into serie_aluno from public.alunos a join public.turmas t on t.id = a.turma_id where a.id = new.aluno_id;
    if sers is not null and array_length(sers,1) > 0 and serie_aluno is not null and not (serie_aluno = any(sers)) then
      raise exception 'Esta proposta não é da sua série';
    end if;
    new.fora_do_prazo := (pr is not null and pr < current_date and (ate is null or ate < current_date));
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
-- Tela do aluno (src/ponte.js): ao montar o cartão, tratar p.status: 'rascunho' → não mostrar;
-- 'fechada'/'encerrada' sem prazo individual → kind:'closed' ("Prazo encerrado. Procure a coordenação…", o app já sabe desenhar).
