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

## Decisões do dono e o que foi feito depois
- **Corretor vê só o nome completo dos outros perfis:** feito (migração 0041). O corretor lê só o próprio perfil; existe a visão `nomes_perfis` (id e nome, sem e-mail) para quando uma tela precisar do nome.
- **Destaques removido do banco:** feito (0041): tabela `destaques` (estava vazia), funções `feed_*`/`responder_destaque` e a coluna `alunos.autoriza_destaque`.
- **Proteção contra senhas vazadas:** NÃO consegui ligar daqui (as ferramentas disponíveis não alteram configurações de Auth). Caminho no painel do Supabase: Authentication → Sign In / Providers (ou Policies) → Password security → ativar "Prevent use of leaked passwords". Sem código.
- **Fluxos que gravam no banco de teste:** agora verificados de ponta a ponta com dados de teste criados e removidos: liberar pacote (corretor não libera, coordenação libera), ciclo completo de devolução e cancelamento, ciclo aluno→corretor→coordenação→aluno, aviso de atraso (aluno cria, coordenação aceita e recusa), AEE, apagar imagens, segurança por perfil.
- **Bug meu achado por esses testes e já corrigido (migração 0040 atualizada):** a trava do corretor dava erro ao salvar QUALQUER correção ("record new has no field id"). Os testes de bloqueio que eu tinha feito antes passaram pelo erro, não pelo motivo certo. Agora o corretor salva normalmente antes da liberação e é bloqueado depois, e a coordenação continua podendo alterar.
- **Relatórios no celular:** corrigido (os seletores rolam por dentro; a página não estoura mais).

## Ainda aguardando a sua resposta
**Envio do aluno em proposta fechada/encerrada** (explicado na conversa; SQL pronto em `docs/PENDENTE-trava-de-envio-do-aluno.sql`).
