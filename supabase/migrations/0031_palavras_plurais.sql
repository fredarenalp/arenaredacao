-- Completa plurais ausentes no dicionário da Ortografia (palavras_pt): -al/-ul → -ais/-uis, -ável/-ível → -áveis/-íveis,
-- -il oxítono sem acento → -is, -el oxítono sem acento → -éis, mais alguns casos de acento deslocado.
-- Gerado por regra; não traz lista de palavras para o repositório.
insert into public.palavras_pt (palavra, norm, comum)
select novo, translate(novo, 'áàâãéêíóôõúç', 'aaaaeeiooouc'), comum
from (
  select distinct on (novo) novo, comum from (
    select left(palavra, -1) || 'is' as novo, comum from public.palavras_pt where palavra ~ '(a|u)l$' and palavra !~ '[- ]'
    union all select left(palavra, -4) || 'áveis', comum from public.palavras_pt where palavra ~ 'ável$'
    union all select left(palavra, -4) || 'íveis', comum from public.palavras_pt where palavra ~ 'ível$'
    union all select left(palavra, -2) || 'is', comum from public.palavras_pt where palavra ~ '^[a-z]+il$' and length(palavra) > 3
    union all select left(palavra, -2) || 'éis', comum from public.palavras_pt where palavra ~ '^[a-z]+el$' and length(palavra) > 3
    union all select * from (values ('raízes', true), ('atrizes', true), ('países', true), ('portugueses', true), ('tenazes', true), ('capatazes', true)) v(n, c)
  ) t order by novo, comum desc
) u
where not exists (select 1 from public.palavras_pt q where q.palavra = u.novo);
