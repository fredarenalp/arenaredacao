-- Elementos do gênero específicos da proposta (a coordenação define; se vazio, vale a lista do gênero).
alter table public.propostas add column elementos text[];
