-- Agenda do plantão de redação: segunda a quinta, 14h às 16h, de 20 em 20 minutos (uma pessoa por horário).
alter table public.plantoes add column data date, add column hora text;
create unique index plantoes_horario_uq on public.plantoes (data, hora) where status = 'agendado';
