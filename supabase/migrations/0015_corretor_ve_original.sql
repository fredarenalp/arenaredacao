create or replace function public.corretor_ve_original(r bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.redacoes x
    join public.redacoes y on y.aluno_id = x.aluno_id and y.proposta_id = x.proposta_id and y.versao = 2
    join public.pacotes p on p.id = y.pacote_id
    where x.id = r and x.versao = 1 and p.corretor_id = (select auth.uid()))
$$;
revoke execute on function public.corretor_ve_original(bigint) from public, anon;

create policy redacoes_corretor_original on public.redacoes for select to authenticated
  using (public.meu_tipo() = 'corretor' and public.corretor_ve_original(id));
create policy correcoes_corretor_original on public.correcoes for select to authenticated
  using (public.meu_tipo() = 'corretor' and public.corretor_ve_original(redacao_id));
create policy marcacoes_corretor_original on public.marcacoes for select to authenticated
  using (public.meu_tipo() = 'corretor' and public.corretor_ve_original(redacao_id));
create policy fotos_corretor_original on storage.objects for select to authenticated
  using (bucket_id = 'redacoes' and public.meu_tipo() = 'corretor'
    and exists (select 1 from public.redacoes x where x.foto_path = storage.objects.name and public.corretor_ve_original(x.id)));
