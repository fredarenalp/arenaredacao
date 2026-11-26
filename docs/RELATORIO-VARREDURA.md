# Relatório da varredura (26/11/2026)

Varredura completa do aluno, do corretor e da coordenação, depois das mudanças recentes (login, Propostas, Evolução do boletim, cartão da 1ª vez, trava do corretor, tela "Hoje", Entregas).
Método: testes automáticos em navegador (celular 320/390, tablet 768, notebook 1024, desktop 1366), leitura de telas por screenshot, simulação de cada perfil direto no banco (RLS e gatilhos) e conselheiro de segurança do Supabase.

## O que foi corrigido (já no ar)
**Aluno**
- Login em branco dizia "Matrícula ou senha incorretas." Agora diz "Preencha a matrícula e a senha." (ou só o que falta). Vale também para o login por e-mail.
- Botão "← Minhas propostas" nas telas de envio/atraso/correção voltava para a lista de Redações; agora diz "← Minhas redações" (existe a aba Propostas).
- Boletim → Médias: "Média dos bimestres encerrados" mostrava 0,0 quando nenhum bimestre tinha nota; agora mostra "–".
- Código morto de Destaques removido de `ponte.js` (aluno e coordenação já não usavam).
**Corretor**
- Trava depois da liberação (já documentada no CLAUDE.md) conferida de ponta a ponta: no banco, como corretor, atualizar/apagar correção, apagar marcações e atualizar redação num pacote liberado são bloqueados; liberar e devolver pacote também.
- Dois testes do celular (`correcao-celular-opcoes`, `correcao-celular-marcas`) assumiam folha vazia; o pacote de teste agora tem marcações salvas. Os testes limpam a folha em memória (não gravam).
**Coordenação**
- Análise: o cartão "Erros mais marcados" ficava cortado em notebook pequeno (≤1100 px). Agora as duas colunas viram uma.
- Pacotes: botão "Ver correções" e etiquetas cortados na coluna Situação. Corrigido (as tabelas dentro de cartões agora rolam e as colunas ficaram mais compactas).
- Propostas: coluna Ações cortada (só "Reabrir | Elementos" aparecia). Os botões agora quebram linha.
- Pessoas: "1 alunos ativos" → "1 aluno ativo".
- A tela chamada "Corretores" (que o menu chama de "Pacotes") agora se chama "Pacotes e corretores".
- Sub-abas rolam no celular. Teste `smoke` ajustado ao menu novo (itens dentro de Consultar/Ajustes).

## O que precisa da sua decisão (NÃO apliquei)
1. **Envio do aluno em proposta fechada/encerrada/rascunho (importante).** O banco deixa o aluno enviar redação em proposta `rascunho`, `fechada` ou `encerrada`, e em proposta de outra série. E a tela do aluno ignora o estado da proposta (só olha as datas). Ou seja, "Fechar" e "Encerrar" na coordenação **não valem para o aluno**. Hoje as 4 propostas do 4º bimestre estão `encerrada` no banco (a coordenação mostra "Encerrada"), enquanto o aluno vê a Proposta 1 aberta. Conserto pronto em `docs/PENDENTE-trava-de-envio-do-aluno.sql` (+ ajuste da tela do aluno descrito no fim do arquivo). Antes de aplicar, é preciso reabrir as propostas que devem receber envios.
2. **Corretor enxerga o cadastro de todos os perfis.** A regra `perfis_leitura` deixa corretor, professor e coordenação lerem nome e e-mail de todos os perfis (incluindo outros corretores e alunos). Provavelmente basta o corretor ler o próprio. Não mexi porque pode haver tela que usa isso.
3. **Tabelas e funções de Destaques seguem no banco** (`destaques`, `feed_*`, `responder_destaque`), sem uso. Posso apagar se confirmar (apagar dados é irreversível).
4. **Proteção contra senhas vazadas desligada** no Supabase Auth (aviso do conselheiro). Liga-se no painel do Supabase, sem código.
5. **Teste `devolver-correcao`** só roda se existir pacote não liberado com correção salva e não devolvida. Hoje o pacote 6 já está devolvido.

## Limites / não verificado
- Fluxos que gravam no banco real (Liberar pacote, Liberar todos, Aceitar/Recusar, enviar redação) não foram acionados de propósito.
- Coordenação em tela de celular (390 px) ainda tem pequenos estouros na aba Relatórios; não é o uso principal.
- Com dados reais só o 4º bimestre tem nota; o gráfico de linhas da Evolução só foi visto com dados de demonstração.
