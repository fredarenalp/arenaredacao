-- Feed e destaques: autorização da família (papel assinado), destaques escolhidos pela coordenação,
-- convite ao aluno (👍/👎), feed da série sem nomes e "erros da série" agregados.
alter table public.alunos add column autoriza_destaque boolean not null default false;

create table public.destaques (
  id bigint generated always as identity primary key,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  serie text not null,
  tipo text not null check (tipo in ('redacao','trecho')),
  titulo text,                      -- tema / motivo curto, sem nome
  texto text not null,              -- texto DIGITADO pela coordenação
  nota_elogio text,                 -- por que brilhou (trecho)
  status text not null default 'aguardando' check (status in ('aguardando','publicada','recusada','retirada')),
  resposta_em timestamptz,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);
create index on public.destaques (aluno_id);
create index on public.destaques (serie, status);
alter table public.destaques enable row level security;
-- coordenação: tudo; professor: lê os dos seus alunos; aluno: lê os próprios (o feed dos outros vai por função, sem aluno_id)
create policy destaques_coord on public.destaques for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
create policy destaques_prof_le on public.destaques for select to authenticated
  using ((select public.meu_tipo()) = 'professor' and public.professor_ve_aluno(aluno_id));
create policy destaques_aluno_le on public.destaques for select to authenticated
  using (aluno_id = (select public.meu_aluno_id()));

-- Resposta do aluno ao convite (aceita/recusa/desfaz/retira); só nos próprios destaques.
create function public.responder_destaque(p_id bigint, p_aceita boolean) returns void
language plpgsql security definer set search_path = public as $$
declare d public.destaques;
begin
  select * into d from destaques where id = p_id and aluno_id = meu_aluno_id();
  if not found then raise exception 'destaque não encontrado'; end if;
  if p_aceita and not (select autoriza_destaque from alunos where id = d.aluno_id) then
    raise exception 'sem autorização da família';
  end if;
  update destaques set status = case when p_aceita then 'publicada'
                                     when d.status = 'publicada' then 'retirada' else 'recusada' end,
                       resposta_em = now()
   where id = p_id;
end $$;

-- Feed da série: só publicados, sem nome nem aluno_id. Aluno vê a própria série; professor/coordenação a série pedida.
create function public.feed_destaques(p_serie text default null) returns table (id bigint, tipo text, titulo text, texto text, nota_elogio text, criado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.tipo, d.titulo, d.texto, d.nota_elogio, d.criado_em
    from destaques d
   where d.status = 'publicada'
     and d.serie = coalesce((select t.serie from alunos a join turmas t on t.id = a.turma_id where a.id = meu_aluno_id()), p_serie)
   order by d.criado_em desc limit 60
$$;

-- Erros da série: contagem por categoria nas correções liberadas; some se houver menos de 5 redações.
create function public.feed_erros_serie() returns table (categoria text, qtd bigint, redacoes bigint)
language plpgsql stable security definer set search_path = public as $$
declare s text; n bigint;
begin
  select t.serie into s from alunos a join turmas t on t.id = a.turma_id where a.id = meu_aluno_id();
  if s is null then return; end if;
  select count(*) into n from redacoes r join correcoes c on c.redacao_id = r.id and c.liberada
    join alunos a on a.id = r.aluno_id join turmas t on t.id = a.turma_id where t.serie = s;
  if n < 5 then return; end if;
  return query
    select m.categoria, count(*), n
      from marcacoes m join redacoes r on r.id = m.redacao_id join correcoes c on c.redacao_id = r.id and c.liberada
      join alunos a on a.id = r.aluno_id join turmas t on t.id = a.turma_id
     where t.serie = s and m.tipo = 'o' and m.categoria is not null
     group by m.categoria order by 2 desc limit 6;
end $$;
revoke execute on function public.responder_destaque(bigint,boolean), public.feed_destaques(text), public.feed_erros_serie() from public, anon;
grant execute on function public.responder_destaque(bigint,boolean), public.feed_destaques(text), public.feed_erros_serie() to authenticated;
