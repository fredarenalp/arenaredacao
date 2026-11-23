# Arena Redação — instruções do projeto

## Regras do dono do projeto (valem sempre)
1. **O protótipo é a referência absoluta.** `prototipo/app.html` É o app; `prototipo/prototipo-v144-original.html`
   é a cópia congelada. Não recriar telas à mão nem "se inspirar": o visual e o comportamento devem ficar idênticos.
   O trabalho é trocar os dados de exemplo por dados reais do Supabase, área por área, via `src/ponte.js` (`window.ARENA`).
2. **Supabase: acesso autorizado sempre, inclusive `execute_sql`.** O dono liberou o uso das ferramentas do Supabase (projeto
   `nklkchelknnvovoilybc`, "Arena Redação") sem pedir permissão: consultas, migrations, funções edge e usuários de teste.
   Não perguntar antes. (Continua valendo cuidado: nada destrutivo fora dos dados de teste e nada de segredos no repositório.)
3. Não criar pull request, a menos que o dono peça. Desenvolver na branch `claude/great-albattani-415kor`.
4. Dados reais de alunos nunca vão para o repositório (ele é público).
5. Usuários de teste (senha `teste`): `teste@arena.com` (coordenação), `corretor@arena.com`. Aluno: usuário `0000` (ou `teste`, ou a matrícula `20260187`), senha `teste`.

## Vocabulário do dono
- **AC** = Assistente de correção (o painel/popover da tela de correção do corretor: categorias, Ortografia, Vocabulário, Verbo…).

## AC · conectivos (implementado)
Conectivo errado/ausente no AC abre "Só marcar | Corrigir"; Corrigir abre o painel lateral (opção B, escolhida pelo dono): campo "Função: X (sugerida) ▾" (palavra usada → função mais confundida, ou posição da linha),
lista com as 5 mais prováveis + "Mais funções…", "por que essa sugestão?" e os conectivos (3 + Ver mais). As escolhas ficam em `m.sin` (e a palavra usada em `m.pal`), entram no comentário da Progressão ("Experimente: …")
e aparecem ao aluno em "Palavras para treinar". Dicionário na tabela privada `conectivos` (16 funções, inclui verbos de fala); o conteúdo NÃO está no repositório.

## AC · Título (critério I, implementado)
Botão "Título" na seção Estética do AC (painel lateral): Ausente / Insuficiente; Insuficiente pergunta "Cópia do tema?" (Sim → comentário pede título próprio; Não → pede mais diálogo com o conteúdo do texto).
Sem marcar = título bom. Segue a grade (arquivo: COMPS[0].niv): ausente → Estética nível 0 ou 1 (sugere 1); insuficiente → no máximo nível 2. Marca `cat:'ti'`, `m.ti` ('aus'|'ins'), `m.cop` (true|false); um por redação;
entra em `contagens().tit`, `sugAuto(a,0)`, `titTxt(a)` (comentário) e no alerta de incoerência; não conta como desvio gramatical.

## Liberação das correções (regra do dono)
A correção salva pelo corretor NÃO vai ao aluno. A coordenação clica em **Liberar pacote** (Corretores → Pacotes): `liberar_pacote(p_pacote)` libera as correções prontas do pacote.
Notas 0 e 10, anuladas, AEE e dúvida pendente são OUTRO processo (aprovação do professor/coordenação, fila de liberação). Se o pacote já foi liberado, novas versões de correção
não retidas continuam liberadas. O corretor não consegue liberar (o gatilho `trg_correcoes` força `liberada`). Teste: `node e2e/liberar-pacote-real.mjs`.

## Como trabalhar
- Lint/testes/build: `npm run lint && npm test && npm run build`.
- Ciclo de dados no banco real: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node e2e/ciclo-real.mjs`.
- Estado da ligação protótipo ↔ banco: ver o final do `README.md`.
- Caça-bugs (não gravam nada no banco): `node e2e/cacabugs-ac.cjs` (todas as categorias/painéis/atalhos do AC) `node e2e/cacabugs-aluno.cjs` (aluno, desktop e celular, com marcas de todos os tipos injetadas) e `node e2e/cacabugs-coord.cjs` (todas as abas da coordenação e do professor). Preview em `localhost:4173`.

## Decisões de produto (aluno, feed, destaques) — IMPLEMENTADAS (etapas 1 a 5), exceto o que está em "Pendente"
Tudo abaixo foi construído (primeira tela, cartões, Ver proposta/Dúvida, estrelas/anotação/Opinião, plantão com agenda seg–qui 14h–16h de 20 em 20 min em Demandas → Plantão, aba Destaques do aluno, tela Destaques da coordenação com autorização da família, tabelas `destaques`/`plantoes`, funções `feed_destaques`/`feed_erros_serie`/`responder_destaque`). Pendente: aviso no celular (sem push), botão "Salvar" dos desenhos, quiz (guardado); "Trechos que brilharam" foi retirado (decisão do dono), aluno ainda não vê o horário do plantão agendado.
- **Já implementado:** aba Análise do professor/coordenação (critérios por turma, erros, palavras, evolução); Vocabulário (Oralidade e Precisão com sinônimos do Houaiss); autocompletar da Ortografia; "Em texto" como aba padrão na correção do aluno.
- **[RETIRADA a pedido do dono: o aluno entra direto na lista de redações; o mesmo formato de cartões agora abre ao clicar em Destaques/Feed, com convite, redações destaque e gráficos da série (média por critério, faixas de nota, erros mais marcados; função `feed_serie`). A análise em cartões de uma correção abre pelo botão "Ver análise em cartões" dentro da correção.]** Primeira tela do aluno (ao entrar): "Parabéns, <nome>! Sua redação voltou" (só quando há correção nova e ainda não vista). Deslizar para CIMA = análise da correção em cartões (estilo stories); deslizar para o LADO (ou "Pular ›") = menu principal (Redações, Boletim, Critérios). No computador: setas e teclado.
- **Tom por nota** (usa a nota de corte da escola, hoje 6): 9–10 comemoração; 6–8,9 incentivo; abaixo de 6 apoio (sem "Parabéns", começa pelo que está bom, UM passo concreto, caminho fácil até o professor, reescrita como oportunidade); anulada = aviso neutro (motivo, o que fazer, prazo). **Abaixo de 6: a nota fica atrás de um toque ("Toque para ver").** Tela "Quer ajuda?" (nota baixa) tem só DOIS botões: "Pedir uma conversa" (texto pequeno: "Agende um horário para ser atendido no plantão de redação.") e "Ver como reescrever" (passo a passo). NÃO tem o botão "Tirar uma dúvida" nessa tela.
- **Sem correção nova:** primeira tela mostra a próxima redação (prazo) e o foco; primeiro acesso explica o caminho; várias correções = uma tela reunindo as novidades.
- **Cartões de critério do aluno:** sem círculos; 4 degraus por critério + uma frase; um foco só ("Seu foco para a próxima redação").
- **Palavras para treinar:** grafia errada riscada + certa, palavra vaga com sugestões, repetida. Compara só com o próprio aluno (nada de ranking/turma).
- **Interações do aluno (feed da correção):** estrelas 1–3 ("Mais ou menos / Ajudou / Ajudou muito") + o que mais ajudou + comentário opcional; anotação privada; dúvida ao professor (conversa no sistema). Nada muda a nota; dúvida NÃO é contestação (contestação está fora do escopo). Coordenação vê agregado, comentários sem nome, avaliação por corretor só com mínimo de 10 respostas e sem virar nota do corretor.
- **Feed é uma TELA SEPARADA** (não é a primeira tela). Abas: Redações destaque, Trechos que brilharam, Erros da série. Feed da série = só números agregados e dicas, sem notas.
- **Trecho que brilhou:** RETIRADO do escopo (decisão do dono); o feed tem só Redações destaque, Erros da série e Meus destaques.
- **Redação destaque:** a COORDENAÇÃO escolhe; sem nome; mostra o TEXTO DIGITADO (não a foto, a letra identifica); **quem digita o texto é a coordenação**. O aluno recebe convite ("Aceito / Prefiro não", pode retirar). **Autorização da família: papel assinado no início do ano** ("o professor pode destacar"), registrada pela coordenação. **O professor compartilha com a SÉRIE inteira.**
- **QUIZ: guardado como ideia, NÃO fazer por enquanto.**
- Paleta: o verde da tela de login (gradiente #52989a → #3c7678; texto #2f5f61); coral apagado só para alertas; fundo creme; cartões brancos com cantos bem arredondados; números grandes.
- **Convite de destaque (aluno):** versão adolescente: um toque, 👍 "Pode usar!" ou 👎 "Prefiro que não", botões do mesmo tamanho; 🎉 e confete só nas bordas; etiquetas "sem o seu nome" e "só o texto digitado"; "Desfazer" e tela "Meus destaques" para mudar de ideia; aviso no celular sem detalhes. O 👍 é a segunda confirmação (a base é o papel da família); registrar resposta e horário. Emojis só nessa tela; o resto do sistema segue com ícones e texto.
- Dados de teste "Zz Análise" foram apagados do banco (aprovado pelo dono). Ainda pendente, DEPOIS (a pedido do dono): trocar as senhas e acessos de teste (`teste`, `ACESSO_TESTE`), tornar o repositório privado.
- **"Ver proposta"** (aluno): na lista de propostas cada proposta tem "Ver proposta" ao lado de "Enviar redação" (vale também depois de corrigida); tela com tema, "o que fazer" (texto escrito pela coordenação) e os elementos do gênero (o sistema já tem os elementos por gênero); e atalho "Ver o que a proposta pede" na tela "Antes de enviar" (lista de conferência existente).
- **Botão "Dúvida"** nos cartões da correção NÃO fala com o professor: abre uma folha com duas abas, **Gênero** (explicação + elementos) e **Proposta** (tema e o que fazer), com link "Ver a proposta completa". O único caminho até o professor é o plantão de redação ("Pedir uma conversa").
- **Redação anulada:** botão "Pedir uma conversa" (plantão), no lugar de "Falar com o professor".
- Dados novos necessários: texto da proposta ("o que fazer"/orientações) por proposta, preenchido pela coordenação ao criar a proposta; explicação do gênero (texto) por gênero, editável pela coordenação.

## Fotos das redações: baixar e apagar (decisão do dono, IMPLEMENTADO)
No fim de cada bimestre os alunos salvam as correções em PDF (tela do aluno → "Salvar todas as correções do bimestre (PDF)", que usa a janela de impressão; há também "Imprimir correção" de uma só) e a coordenação guarda o que quiser (Relatórios → Imprimir correções). Depois a coordenação apaga as FOTOS
(Propostas → "Apagar imagens…", escolhe o bimestre, "Ver o que será apagado", digita APAGAR). Fica no banco só nota, comentários e marcações. Sem protocolo no sistema: a combinação é oral.
Função `apagar-imagens` (só coordenação; só redações corrigidas e com correção liberada; redação em correção não é tocada; arquivo comum a outras redações não é apagado). Sem foto, o aluno vê o aviso "A foto desta redação foi arquivada" e o PDF sai sem a folha; `foto()` sintética do protótipo nunca aparece com dados reais.
Testes: `node e2e/apagar-imagens-real.mjs` (só apaga as redações que ele cria) e `node e2e/pdf-bimestre.cjs`. O link assinado de uma foto já apagada pode continuar abrindo por um tempo (cache do storage).
