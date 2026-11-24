-- As palavras comuns (≈21 mil) numa só chamada, já ordenadas (tamanho, alfabética): o navegador guarda e sugere na hora, sem ir ao banco a cada tecla.
create function public.palavras_comuns() returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_array(palavra, norm) order by tam, palavra), '[]'::jsonb) from public.palavras_pt where comum
$$;
revoke execute on function public.palavras_comuns() from public, anon;
grant execute on function public.palavras_comuns() to authenticated;
