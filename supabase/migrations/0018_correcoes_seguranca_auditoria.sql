
-- 1) Os ganchos (nomes de alunos e notas do professor) estavam legíveis por qualquer usuário logado,
--    inclusive aluno e corretor (a regra "regras_le" liberava tudo). Só coordenação e professor leem.
drop policy if exists regras_le on public.regras;
create policy regras_le on public.regras for select to authenticated
  using (chave <> 'ganchos' or public.meu_tipo() in ('coordenacao','professor'));

-- 2) fora_do_prazo vinha do navegador (o aluno podia mentir). Passa a ser calculado no servidor:
--    atrasado se a proposta tem prazo vencido e o aluno não tem prazo individual ainda válido.
--    Também impede enviar a 2ª versão antes de a 1ª estar corrigida e liberada.
create or replace function public.trg_redacao_envio() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr date; ate date; liberada boolean;
begin
  if public.meu_tipo() = 'aluno' then
    select prazo into pr from public.propostas where id = new.proposta_id;
    select p.ate into ate from public.prazos_individuais p where p.aluno_id = new.aluno_id and p.proposta_id = new.proposta_id;
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
revoke execute on function public.trg_redacao_envio() from public, anon, authenticated;
drop trigger if exists redacoes_envio_bi on public.redacoes;
create trigger redacoes_envio_bi before insert on public.redacoes
  for each row execute function public.trg_redacao_envio();

-- 3) O bucket de fotos não tinha limite de tamanho nem de tipo: qualquer aluno podia subir arquivos enormes
--    ou não-imagens e esgotar o armazenamento. Limite de 12 MB e só imagens.
update storage.buckets
   set file_size_limit = 12582912,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
 where id = 'redacoes';
