create policy redacoes_coord_exclui on public.redacoes for delete to authenticated
  using (public.meu_tipo() = 'coordenacao');
create policy fotos_coord_exclui on storage.objects for delete to authenticated
  using (bucket_id = 'redacoes' and public.meu_tipo() = 'coordenacao');
