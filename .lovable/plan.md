
## Permitir que professoras baixem suas agendas

Hoje, ao clicar em **Enviar**, o PDF é baixado automaticamente uma única vez. Se a professora fechar a aba ou perder o arquivo, não há como recuperar — o painel de histórico é restrito ao admin.

### O que vou adicionar

**Página pública de histórico por turma** (`/turma/:slug/historico`)
- Acessível a partir de um botão **"Ver agendas enviadas"** no topo do formulário da turma
- Lista as últimas agendas enviadas **daquela turma**, ordenadas da mais recente para a mais antiga
- Cada item mostra: semana (data de início), data/hora do envio, e botão **Baixar PDF**
- Sem login — qualquer pessoa com o link da turma pode baixar
- Limite de exibição: últimas 20 agendas da turma (suficiente para uso prático, evita lista enorme)

### Ajuste de segurança no banco

Hoje a tabela `agendas` permite apenas:
- INSERT público (qualquer um envia)
- SELECT/DELETE só para admin

Vou adicionar uma política de **SELECT público** para que a página de histórico consiga ler os registros. Os dados já são de uso interno do colégio (agendas escolares) e a página fica acessível só para quem entra pelo app — mesmo nível de proteção do envio.

### Detalhes técnicos

- Nova rota `/turma/:slug/historico` em `src/App.tsx`
- Nova página `src/pages/TurmaHistorico.tsx` que consulta `agendas` filtrando por `turma`, ordena por `created_at desc`, e usa `gerarPdfAgenda` (já existente em `src/lib/pdf.ts`) para baixar
- Botão **"Ver agendas enviadas"** no cabeçalho de `src/pages/Turma.tsx`
- Migração SQL adicionando policy: `CREATE POLICY "Leitura pública das agendas" ON agendas FOR SELECT TO public USING (true);`

### Alternativa, se preferir mais privacidade

Se você quiser que apenas o admin tenha acesso ao histórico (mantendo o comportamento atual), me avise — nesse caso eu não faço nada e a professora continua precisando salvar o PDF na hora do envio.
