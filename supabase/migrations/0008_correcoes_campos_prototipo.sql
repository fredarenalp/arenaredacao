alter table public.correcoes alter column n1 drop not null, alter column n2 drop not null, alter column n3 drop not null, alter column n4 drop not null, alter column n5 drop not null;
alter table public.correcoes add column anulacao text;
alter table public.correcoes add column diag smallint;
alter table public.correcoes add column extras jsonb not null default '{}'::jsonb;
