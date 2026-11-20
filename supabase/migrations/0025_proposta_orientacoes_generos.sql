-- "Ver proposta": orientação por proposta (escrita pela coordenação) e explicação/elementos por gênero (editável).
alter table public.propostas add column orientacoes text;
create table public.generos (
  nome text primary key,
  descricao text not null default '',
  elementos text[] not null default '{}'
);
alter table public.generos enable row level security;
create policy generos_le on public.generos for select to authenticated using (true);
create policy generos_coord on public.generos for all to authenticated
  using ((select public.meu_tipo()) = 'coordenacao') with check ((select public.meu_tipo()) = 'coordenacao');
insert into public.generos (nome, descricao, elementos) values
 ('Crônica','Texto curto que conta, com um olhar pessoal, um fato ou uma cena do cotidiano. Costuma ter tom leve ou reflexivo e termina com uma observação sobre o que foi vivido.','{"Situação inicial","Conflito","Ponto alto","Desfecho","Marcas do cotidiano"}'),
 ('Dissertativo-argumentativo','Texto que defende uma ideia (a tese) com argumentos e termina com uma conclusão. Usa linguagem formal e organiza as ideias em parágrafos.','{"Tese","Argumento 1","Argumento 2","Contra-argumento","Conclusão"}'),
 ('Carta de leitor','Texto enviado a um jornal ou revista para comentar uma matéria e dar uma opinião. É escrito em primeira pessoa e com linguagem formal.','{"Saudação","Matéria comentada","Opinião","Argumento","Fecho e assinatura"}'),
 ('Resenha','Texto que apresenta uma obra (livro, filme, série), conta o essencial dela e dá uma avaliação com argumentos, para ajudar o leitor a decidir se quer conhecê-la.','{"Apresentação da obra","Resumo","Análise crítica","Avaliação","Recomendação"}'),
 ('Notícia','Texto que informa um fato recente de modo objetivo, respondendo: o que aconteceu, quando, onde, com quem e por quê. Não traz opinião.','{"Título","Lide","Desenvolvimento","Fonte","Fechamento"}'),
 ('Notícia esportiva','Notícia sobre um fato do esporte, como um resultado, uma competição ou um evento. Informa com objetividade e sem opinião.','{"Título","Lide","Desenvolvimento","Fonte","Fechamento"}'),
 ('Manifesto cultural','Texto que defende publicamente uma causa ou ideia ligada à cultura e chama o leitor a se engajar. Combina argumentos com um tom de convocação.','{"Título ou lema","Contexto","Posicionamento","Argumentos","Convocação"}');
