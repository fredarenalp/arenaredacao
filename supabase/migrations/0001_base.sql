-- Arena Redação — esquema base com RLS por perfil.
create type public.tipo_perfil as enum ('aluno','corretor','professor','coordenacao');
create type public.etapa_redacao as enum ('enviada','em_correcao','aguardando_liberacao','corrigida');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo public.tipo_perfil not null,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.turmas (
  id bigint generated always as identity primary key,
  ano int not null,
  serie text not null,
  nome text not null,
  unique (ano, serie, nome)
);

create table public.alunos (
  id bigint generated always as identity primary key,
  perfil_id uuid unique references public.perfis(id) on delete set null,
  turma_id bigint not null references public.turmas(id),
  matricula text not null unique,
  nome text not null
);

create table public.professor_turmas (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  turma_id bigint not null references public.turmas(id) on delete cascade,
  primary key (perfil_id, turma_id)
);

create table public.propostas (
  id bigint generated always as identity primary key,
  ano int not null,
  bimestre int not null check (bimestre between 1 and 4),
  titulo text not null,
  genero text not null,
  prazo date
);

create table public.redacoes (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  proposta_id bigint not null references public.propostas(id),
  versao int not null default 1 check (versao in (1,2)),
  foto_path text,
  etapa public.etapa_redacao not null default 'enviada',
  corretor_id uuid references public.perfis(id),
  fora_do_prazo boolean not null default false,
  enviada_em timestamptz not null default now(),
  unique (aluno_id, proposta_id, versao)
);

create table public.marcacoes (
  id bigint generated always as identity primary key,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  tipo text not null check (tipo in ('o','c')),
  categoria text,
  linha int,
  dados jsonb not null default '{}'::jsonb
);
create index on public.marcacoes (redacao_id);

create table public.correcoes (
  redacao_id bigint primary key references public.redacoes(id) on delete cascade,
  n1 smallint not null check (n1 between 0 and 4),
  n2 smallint not null check (n2 between 0 and 4),
  n3 smallint not null check (n3 between 0 and 4),
  n4 smallint not null check (n4 between 0 and 4),
  n5 smallint not null check (n5 between 0 and 4),
  nota numeric(3,1) generated always as ((n1+n2+n3+n4+n5) * 0.5) stored,
  comentario text,
  liberada boolean not null default false,
  liberada_em timestamptz,
  atualizada_em timestamptz not null default now()
);

create table public.eventos (
  id bigint generated always as identity primary key,
  redacao_id bigint references public.redacoes(id) on delete cascade,
  autor uuid references public.perfis(id),
  acao text not null,
  anterior jsonb,
  novo jsonb,
  justificativa text,
  em timestamptz not null default now()
);

-- Helpers (security definer evita recursão de RLS)
create function public.meu_tipo() returns public.tipo_perfil
language sql stable security definer set search_path = public as
$$ select tipo from public.perfis where id = auth.uid() and ativo $$;

create function public.meu_aluno_id() returns bigint
language sql stable security definer set search_path = public as
$$ select id from public.alunos where perfil_id = auth.uid() $$;

create function public.professor_ve_aluno(a bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.alunos al join public.professor_turmas pt on pt.turma_id = al.turma_id
   where al.id = a and pt.perfil_id = auth.uid()) $$;

create function public.pode_ver_redacao(r bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.redacoes x where x.id = r and (
      public.meu_tipo() in ('corretor','coordenacao')
      or x.aluno_id = public.meu_aluno_id()
      or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(x.aluno_id))
    ))
$$;

alter table public.perfis enable row level security;
alter table public.turmas enable row level security;
alter table public.alunos enable row level security;
alter table public.professor_turmas enable row level security;
alter table public.propostas enable row level security;
alter table public.redacoes enable row level security;
alter table public.marcacoes enable row level security;
alter table public.correcoes enable row level security;
alter table public.eventos enable row level security;

create policy perfis_leitura on public.perfis for select to authenticated
  using (id = auth.uid() or public.meu_tipo() in ('corretor','professor','coordenacao'));
create policy perfis_coord on public.perfis for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

create policy turmas_leitura on public.turmas for select to authenticated using (true);
create policy turmas_coord on public.turmas for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

create policy alunos_leitura on public.alunos for select to authenticated
  using (perfil_id = auth.uid() or public.meu_tipo() in ('corretor','coordenacao')
         or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(id)));
create policy alunos_coord on public.alunos for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

create policy pt_leitura on public.professor_turmas for select to authenticated
  using (perfil_id = auth.uid() or public.meu_tipo() = 'coordenacao');
create policy pt_coord on public.professor_turmas for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

create policy propostas_leitura on public.propostas for select to authenticated using (true);
create policy propostas_coord on public.propostas for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

create policy redacoes_leitura on public.redacoes for select to authenticated
  using (public.pode_ver_redacao(id));
create policy redacoes_aluno_envia on public.redacoes for insert to authenticated
  with check (aluno_id = public.meu_aluno_id() and etapa = 'enviada');
create policy redacoes_staff_atualiza on public.redacoes for update to authenticated
  using (public.meu_tipo() in ('corretor','coordenacao'))
  with check (public.meu_tipo() in ('corretor','coordenacao'));

-- Marcações e correções: aluno só vê depois de liberada.
create policy marcacoes_leitura on public.marcacoes for select to authenticated
  using (public.meu_tipo() in ('corretor','coordenacao')
    or exists (select 1 from public.correcoes c join public.redacoes r on r.id = c.redacao_id
               where c.redacao_id = marcacoes.redacao_id and c.liberada
                 and (r.aluno_id = public.meu_aluno_id()
                      or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(r.aluno_id)))));
create policy marcacoes_corretor on public.marcacoes for all to authenticated
  using (public.meu_tipo() in ('corretor','coordenacao'))
  with check (public.meu_tipo() in ('corretor','coordenacao'));

create policy correcoes_leitura on public.correcoes for select to authenticated
  using (public.meu_tipo() in ('corretor','coordenacao')
    or (liberada and public.pode_ver_redacao(redacao_id)));
create policy correcoes_corretor on public.correcoes for all to authenticated
  using (public.meu_tipo() in ('corretor','coordenacao'))
  with check (public.meu_tipo() in ('corretor','coordenacao'));

create policy eventos_leitura on public.eventos for select to authenticated
  using (public.meu_tipo() = 'coordenacao');
create policy eventos_insere on public.eventos for insert to authenticated
  with check (public.meu_tipo() in ('corretor','coordenacao') and autor = auth.uid());

-- Só a coordenação libera a correção para o aluno; toda mudança de nota é auditada.
create function public.trg_correcoes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.liberada is distinct from old.liberada and public.meu_tipo() <> 'coordenacao' then
    raise exception 'Somente a coordenação libera correções';
  end if;
  if tg_op = 'INSERT' and new.liberada and public.meu_tipo() <> 'coordenacao' then
    raise exception 'Somente a coordenação libera correções';
  end if;
  if new.liberada and (tg_op = 'INSERT' or not old.liberada) then new.liberada_em = now(); end if;
  new.atualizada_em = now();
  if tg_op = 'UPDATE' and (new.n1,new.n2,new.n3,new.n4,new.n5) is distinct from (old.n1,old.n2,old.n3,old.n4,old.n5) then
    insert into public.eventos (redacao_id, autor, acao, anterior, novo)
    values (new.redacao_id, auth.uid(), 'nota_alterada',
      jsonb_build_object('niveis', array[old.n1,old.n2,old.n3,old.n4,old.n5], 'nota', old.nota),
      jsonb_build_object('niveis', array[new.n1,new.n2,new.n3,new.n4,new.n5]));
  end if;
  return new;
end $$;
create trigger correcoes_biu before insert or update on public.correcoes
  for each row execute function public.trg_correcoes();

-- Bucket privado para fotos das redações.
insert into storage.buckets (id, name, public) values ('redacoes','redacoes', false) on conflict do nothing;
create policy fotos_leitura on storage.objects for select to authenticated
  using (bucket_id = 'redacoes' and (
    public.meu_tipo() in ('corretor','coordenacao')
    or (storage.foldername(name))[1] = public.meu_aluno_id()::text));
create policy fotos_envio on storage.objects for insert to authenticated
  with check (bucket_id = 'redacoes' and (storage.foldername(name))[1] = public.meu_aluno_id()::text);
