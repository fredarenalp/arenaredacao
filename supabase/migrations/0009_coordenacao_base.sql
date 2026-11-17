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
