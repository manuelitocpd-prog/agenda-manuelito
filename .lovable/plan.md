
## Atualizações no sistema de agendas

### 1. Conta admin
- Criar conta no sistema de autenticação para `manuelitocpd@gmail.com` (com senha temporária que você poderá redefinir no primeiro acesso ou que eu defino e te informo)
- Inserir registro em `user_roles` com papel `admin` para esse usuário
- Você poderá entrar em `/admin` imediatamente após

### 2. Múltiplas disciplinas por dia
Hoje cada bloco (dia) tem **uma** disciplina com seus campos. Vou alterar para permitir **N disciplinas por dia**:

- Cada bloco passa a conter uma lista de "disciplinas", cada uma com: **disciplina, conteúdo, atividade de classe, atividade de casa**
- Botão **"+ Adicionar disciplina"** dentro de cada dia, abrindo um novo conjunto de campos
- Botão de **remover** ao lado de cada disciplina extra (a primeira sempre fica)
- **Observação** e **assinatura do responsável** continuam sendo um único campo por dia (não se repetem por disciplina)
- Estrutura salva no banco (campo `blocos` JSONB) será expandida — agendas antigas continuam compatíveis (migração leve no carregamento, tratando o formato antigo como uma única disciplina)

### 3. PDF — tipografia e ajuste automático
- **Tamanho base de fonte = 11pt** para o conteúdo dos campos
- **Títulos dos campos em negrito** (Disciplina, Conteúdo, Atividade de classe, Atividade de casa, Observação) — já são, mas vou reforçar peso/contraste
- **Auto-ajuste (shrink-to-fit):** quando o conteúdo de um bloco não couber na caixa em 11pt, a fonte daquele bloco específico é reduzida progressivamente (10 → 9 → 8 → 7) até caber. Blocos que cabem em 11pt permanecem em 11pt — a redução é exceção, por bloco, nunca global.
- Múltiplas disciplinas no mesmo bloco são renderizadas em sequência, com pequeno separador entre elas, mantendo o mesmo cálculo de auto-ajuste

### 4. Formulário (tela da turma)
- Reestruturação visual do bloco do dia para acomodar uma ou mais disciplinas, mantendo a UX limpa: cada disciplina dentro de um sub-cartão com cabeçalho "Disciplina 1", "Disciplina 2"…
- Indicador no resumo do dia mostra quantas disciplinas foram preenchidas

### Detalhes técnicos
- `src/lib/turmas.ts`: novo tipo `Disciplina` e `Bloco` passa a ter `disciplinas: Disciplina[]` (+ `observacao`, `incluirAssinatura`, `data`); helper de migração para o formato antigo
- `src/pages/Turma.tsx`: UI para adicionar/remover disciplinas; ajustes nos handlers
- `src/pages/Admin.tsx`: leitura compatível com ambos os formatos
- `src/lib/pdf.ts`: renderização de múltiplas disciplinas por bloco + algoritmo de shrink-to-fit por bloco (mede altura necessária, decrementa fonte até caber)
- Criação do usuário admin via Supabase Auth Admin API + `INSERT` em `user_roles`

Após aprovação eu executo tudo e te informo a senha inicial da conta admin.
