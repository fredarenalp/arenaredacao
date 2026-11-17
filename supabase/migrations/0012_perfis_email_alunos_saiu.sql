alter table public.perfis add column email text;
update public.perfis p set email = u.email from auth.users u where u.id = p.id;
alter table public.alunos add column saiu boolean not null default false;
