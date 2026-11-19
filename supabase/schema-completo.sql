-- ARENA REDAÇÃO — esquema completo do banco (Supabase/Postgres), gerado de uma vez a partir das migrations.
-- Execute em um projeto novo, no SQL Editor, de cima para baixo. Depois publique a função supabase/functions/criar-usuario.

-- ===== migrations/0001_base.sql =====
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

-- ===== migrations/0002_revoga_execucao_anon.sql =====
revoke execute on function public.meu_tipo(), public.meu_aluno_id(), public.professor_ve_aluno(bigint), public.pode_ver_redacao(bigint), public.trg_correcoes() from public, anon;
revoke execute on function public.trg_correcoes() from authenticated;

-- ===== migrations/0003_comunicados.sql =====
create table public.comunicados (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  redacao_id bigint references public.redacoes(id) on delete set null,
  texto text not null check (length(texto) between 1 and 2000),
  criado_por uuid not null references public.perfis(id),
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);
alter table public.comunicados enable row level security;
create policy comunicados_coord on public.comunicados for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao' and criado_por = auth.uid());
create policy comunicados_aluno_le on public.comunicados for select to authenticated
  using (aluno_id = public.meu_aluno_id());
create policy comunicados_aluno_marca on public.comunicados for update to authenticated
  using (aluno_id = public.meu_aluno_id()) with check (aluno_id = public.meu_aluno_id());
create index on public.comunicados (aluno_id);

-- ===== migrations/0004_indices_fks.sql =====
create index if not exists alunos_turma_id_idx on public.alunos (turma_id);
create index if not exists comunicados_criado_por_idx on public.comunicados (criado_por);
create index if not exists comunicados_redacao_id_idx on public.comunicados (redacao_id);
create index if not exists eventos_autor_idx on public.eventos (autor);
create index if not exists eventos_redacao_id_idx on public.eventos (redacao_id);
create index if not exists professor_turmas_turma_id_idx on public.professor_turmas (turma_id);
create index if not exists redacoes_corretor_id_idx on public.redacoes (corretor_id);
create index if not exists redacoes_proposta_id_idx on public.redacoes (proposta_id);

-- ===== migrations/0005_redacoes_leitura_direta.sql =====
-- A política antiga consultava a própria tabela via função e não enxergava a linha recém-inserida
-- (INSERT ... RETURNING falhava para o aluno). Agora avalia a linha diretamente.
drop policy redacoes_leitura on public.redacoes;
create policy redacoes_leitura on public.redacoes for select to authenticated
  using (
    aluno_id = public.meu_aluno_id()
    or public.meu_tipo() in ('corretor','coordenacao')
    or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  );

-- ===== migrations/0006_coordenacao_exclui_redacao.sql =====
create policy redacoes_coord_exclui on public.redacoes for delete to authenticated
  using (public.meu_tipo() = 'coordenacao');
create policy fotos_coord_exclui on storage.objects for delete to authenticated
  using (bucket_id = 'redacoes' and public.meu_tipo() = 'coordenacao');

-- ===== migrations/0007_pacotes.sql =====
create table public.pacotes (
  id bigint generated always as identity primary key,
  numero int not null unique,
  serie text not null,
  proposta_id bigint references public.propostas(id),
  rotulo text not null,
  entrega date,
  prazo date,
  reescrita boolean not null default false,
  atrasadas boolean not null default false,
  corretor_id uuid references public.perfis(id),
  criado_em timestamptz not null default now()
);
create index on public.pacotes (corretor_id);
create index on public.pacotes (proposta_id);
alter table public.pacotes enable row level security;
create policy pacotes_corretor_le on public.pacotes for select to authenticated
  using (corretor_id = (select auth.uid()) or public.meu_tipo() in ('coordenacao','professor'));
create policy pacotes_coord on public.pacotes for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

alter table public.redacoes add column pacote_id bigint references public.pacotes(id) on delete set null;
alter table public.redacoes add column obs text;
create index on public.redacoes (pacote_id);

drop policy redacoes_leitura on public.redacoes;
create policy redacoes_leitura on public.redacoes for select to authenticated
  using (
    aluno_id = public.meu_aluno_id()
    or public.meu_tipo() = 'coordenacao'
    or (public.meu_tipo() = 'corretor' and (pacote_id is null or exists (select 1 from public.pacotes p where p.id = pacote_id and p.corretor_id = (select auth.uid()))))
    or (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  );

-- ===== migrations/0008_correcoes_campos_prototipo.sql =====
alter table public.correcoes alter column n1 drop not null, alter column n2 drop not null, alter column n3 drop not null, alter column n4 drop not null, alter column n5 drop not null;
alter table public.correcoes add column anulacao text;
alter table public.correcoes add column diag smallint;
alter table public.correcoes add column extras jsonb not null default '{}'::jsonb;

-- ===== migrations/0009_coordenacao_base.sql =====
-- Propostas com número/séries/2º prazo; avisos de atraso/ausência; log com texto; liberação automática das correções comuns.
alter table public.propostas add column numero int, add column series int[] not null default '{7,8,9}', add column prazo2 date, add column status text not null default 'aberta', add column sem_reescrita boolean not null default false;
update public.propostas set numero = id where numero is null;

create table public.avisos (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  proposta_id bigint references public.propostas(id),
  tipo text not null check (tipo in ('atraso','ausencia')),
  motivo text not null,
  texto text,
  status text not null default 'pend' check (status in ('pend','aceito','recusado')),
  criado_em timestamptz not null default now(),
  decidido_por uuid references public.perfis(id),
  decidido_em timestamptz
);
create index on public.avisos (aluno_id);
create index on public.avisos (proposta_id);
alter table public.avisos enable row level security;
create policy avisos_aluno on public.avisos for select to authenticated
  using (aluno_id = public.meu_aluno_id() or public.meu_tipo() in ('coordenacao','professor'));
create policy avisos_aluno_cria on public.avisos for insert to authenticated
  with check (aluno_id = public.meu_aluno_id());
create policy avisos_coord on public.avisos for update to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

alter table public.eventos add column texto text, add column tipo text;
create index if not exists eventos_em_idx on public.eventos (em desc);

create or replace function public.trg_correcoes() returns trigger
language plpgsql security definer set search_path = public as $$
declare soma int; retida boolean;
begin
  soma := coalesce(new.n1,0)+coalesce(new.n2,0)+coalesce(new.n3,0)+coalesce(new.n4,0)+coalesce(new.n5,0);
  retida := new.anulacao is not null or soma = 0 or soma = 20 or coalesce((new.extras->>'retida')::boolean, false);
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

-- ===== migrations/0010_acessos.sql =====
create table public.acessos (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  aluno_id bigint references public.alunos(id) on delete cascade,
  em timestamptz not null default now()
);
create index on public.acessos (perfil_id);
create index on public.acessos (aluno_id);
create index on public.acessos (em desc);
alter table public.acessos enable row level security;
create policy acessos_registra on public.acessos for insert to authenticated
  with check (perfil_id = (select auth.uid()));
create policy acessos_le on public.acessos for select to authenticated
  using (public.meu_tipo() in ('coordenacao','professor') or perfil_id = (select auth.uid()));

-- ===== migrations/0011_avisos_destino_regras.sql =====
alter table public.avisos add column destino uuid references public.perfis(id);
create index on public.avisos (destino);
create index on public.avisos (decidido_por);

create table public.regras (
  chave text primary key,
  valor jsonb not null,
  atualizada_em timestamptz not null default now(),
  atualizada_por uuid references public.perfis(id)
);
alter table public.regras enable row level security;
create policy regras_le on public.regras for select to authenticated using (true);
create policy regras_coord on public.regras for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');
create index on public.regras (atualizada_por);

-- ===== migrations/0012_perfis_email_alunos_saiu.sql =====
alter table public.perfis add column email text;
update public.perfis p set email = u.email from auth.users u where u.id = p.id;
alter table public.alunos add column saiu boolean not null default false;

-- ===== migrations/0013_professor_politicas.sql =====
-- professor enxerga e decide as correções retidas dos alunos das turmas dele
create or replace function public.professor_ve_redacao(r bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.redacoes x where x.id = r and public.professor_ve_aluno(x.aluno_id))
$$;
revoke execute on function public.professor_ve_redacao(bigint) from public, anon;

create policy correcoes_professor_le on public.correcoes for select to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy correcoes_professor_decide on public.correcoes for update to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy marcacoes_professor_le on public.marcacoes for select to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy marcacoes_professor_grava on public.marcacoes for all to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_redacao(redacao_id));
create policy redacoes_professor_atualiza on public.redacoes for update to authenticated
  using (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id))
  with check (public.meu_tipo() = 'professor' and public.professor_ve_aluno(aluno_id));
drop policy eventos_insere on public.eventos;
create policy eventos_insere on public.eventos for insert to authenticated
  with check (public.meu_tipo() in ('corretor','coordenacao','professor') and autor = (select auth.uid()));
create policy eventos_professor_le on public.eventos for select to authenticated
  using (public.meu_tipo() = 'professor');
create policy fotos_professor_le on storage.objects for select to authenticated
  using (bucket_id = 'redacoes' and public.meu_tipo() = 'professor');
create policy comunicados_professor_le on public.comunicados for select to authenticated
  using (public.meu_tipo() = 'professor');

-- ===== migrations/0014_retornos.sql =====
create table public.retornos (
  id bigint generated always as identity primary key,
  corretor_id uuid not null references public.perfis(id) on delete cascade,
  redacao_id bigint not null references public.redacoes(id) on delete cascade,
  resultado text not null check (resultado in ('aprovada','modificada','duvida','ia')),
  antes smallint[],
  depois smallint[],
  resposta text,
  visto boolean not null default false,
  entendido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.retornos (corretor_id);
create index on public.retornos (redacao_id);
alter table public.retornos enable row level security;
create policy retornos_corretor_le on public.retornos for select to authenticated
  using (corretor_id = (select auth.uid()) or public.meu_tipo() in ('coordenacao','professor'));
create policy retornos_corretor_marca on public.retornos for update to authenticated
  using (corretor_id = (select auth.uid())) with check (corretor_id = (select auth.uid()));
create policy retornos_decisor_cria on public.retornos for insert to authenticated
  with check (public.meu_tipo() in ('coordenacao','professor'));

-- ===== migrations/0015_corretor_ve_original.sql =====
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

-- ===== migrations/0016_prazos_individuais.sql =====
create table public.prazos_individuais (
  id bigint generated always as identity primary key,
  aluno_id bigint not null references public.alunos(id) on delete cascade,
  proposta_id bigint not null references public.propostas(id) on delete cascade,
  ate date not null,
  vale_nota boolean not null default true,
  motivo text,
  criado_por uuid references public.perfis(id),
  criado_em timestamptz not null default now(),
  unique (aluno_id, proposta_id)
);
create index on public.prazos_individuais (proposta_id);
create index on public.prazos_individuais (criado_por);
alter table public.prazos_individuais enable row level security;
create policy prazos_aluno_le on public.prazos_individuais for select to authenticated
  using (aluno_id = public.meu_aluno_id() or public.meu_tipo() in ('coordenacao','professor'));
create policy prazos_coord on public.prazos_individuais for all to authenticated
  using (public.meu_tipo() = 'coordenacao') with check (public.meu_tipo() = 'coordenacao');

-- ===== migrations/0017_gerar_pacotes.sql =====
-- Agrupa as redações enviadas (com prazo vencido) em um pacote por turma + proposta + versão.
create or replace function public.gerar_pacotes() returns int
language plpgsql security definer set search_path = public as $$
declare g record; novo bigint; n int := 0; num int; dias int;
begin
  if public.meu_tipo() is distinct from 'coordenacao' then raise exception 'Somente a coordenação gera pacotes'; end if;
  select coalesce((valor #>> '{}')::int, 5) into dias from public.regras where chave = 'devolve';
  dias := coalesce(dias, 5);
  for g in
    select a.turma_id, r.proposta_id, r.versao, t.serie, t.nome as turma, p.numero, p.genero, array_agg(r.id) as ids
    from public.redacoes r
    join public.alunos a on a.id = r.aluno_id
    join public.turmas t on t.id = a.turma_id
    join public.propostas p on p.id = r.proposta_id
    where r.pacote_id is null and r.etapa = 'enviada' and (p.prazo is null or p.prazo < current_date)
    group by a.turma_id, r.proposta_id, r.versao, t.serie, t.nome, p.numero, p.genero
  loop
    select coalesce(max(numero), 0) + 1 into num from public.pacotes;
    insert into public.pacotes (numero, serie, proposta_id, rotulo, entrega, prazo, reescrita)
    values (num, g.serie || 'º ano ' || g.turma, g.proposta_id,
            case when g.versao = 2 then '2ª versão (reescrita)' else '1ª versão' end || ' · Proposta ' || g.numero || ' · ' || g.genero,
            current_date, current_date + dias, g.versao = 2)
    returning id into novo;
    update public.redacoes set pacote_id = novo where id = any (g.ids);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.gerar_pacotes() from public, anon;
grant execute on function public.gerar_pacotes() to authenticated;

-- ===== pendente.sql =====
-- SQL pendente (ainda NÃO aplicado ao banco). Será consolidado em supabase/schema-completo.sql ao final.

-- 1) O professor precisa gravar os ganchos que corrige (hoje só a coordenação escreve em regras).
create policy regras_professor_ganchos on public.regras for all to authenticated
  using (public.meu_tipo() = 'professor' and chave = 'ganchos')
  with check (public.meu_tipo() = 'professor' and chave = 'ganchos');

-- ===== correções de segurança da auditoria =====

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

