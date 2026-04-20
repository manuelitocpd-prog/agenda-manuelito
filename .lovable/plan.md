
## Sistema de Agendas — Colégio Manuelito

App web para professoras da Educação Infantil preencherem agendas semanais e gerarem um PDF A4 pronto para impressão em preto e branco. Inclui painel administrativo para histórico.

### Identidade visual

- **Logo colorida** (amarelo, azul, roxo) usada nas páginas do sistema (home, formulário, painel admin), aproveitando a identidade do Colégio Manuelito.
- **Logo preta vazada** usada apenas no PDF gerado (impressão P&B).
- Paleta do app inspirada na logo: tons de azul como cor primária, com toques sutis de amarelo e roxo como acentos, sobre fundo branco/cinza muito claro. Visual moderno, leve e infantil sem ser carregado.
- Tipografia limpa e legível, cantos arredondados, cartões com sombra suave.

### Páginas e fluxo

**1. Página inicial (`/`)**
- Logo colorida do Colégio Manuelito centralizada
- Título "Agendas — Educação Infantil"
- 4 cartões grandes para escolher a turma: **Infantil 2 · Infantil 3 · Infantil 4 · Infantil 5** (cada cartão com um tom da paleta)
- Link discreto no rodapé "Acesso administrativo"

**2. Formulário da turma (`/turma/:nome`)**
- Cabeçalho com logo colorida + título "Agenda — Infantil X"
- **Seletor da semana** (data inicial, segunda-feira) para nomear o envio
- **5 blocos** de Segunda a Sexta. Cada bloco contém:
  - Data (opcional — se vazio, bloco fica em branco no PDF)
  - Disciplina
  - Conteúdo
  - Atividade de classe
  - Atividade de casa
  - Checkbox "incluir campo de assinatura do responsável"
  - Observação (opcional)
- Blocos podem ser recolhidos/expandidos. Bloco totalmente vazio = "sem aula"
- Botões: **Pré-visualizar PDF** e **Enviar**
- Ao enviar: salva no banco, gera o PDF, baixa automaticamente, mostra toast de sucesso

**3. Painel administrativo (`/admin`)**
- Login simples com senha
- Lista de agendas enviadas com filtros por turma e data
- Cada linha: turma, semana, data de envio, botões **Baixar PDF** e **Ver detalhes**
- Opção de excluir envios antigos

### PDF gerado (A4 vertical, P&B)

- **Logo preta vazada** no topo de cada bloco
- Layout em **grade 2 colunas (3 blocos à esquerda, 2 à direita)** otimizando o espaço A4
- Cada bloco com:
  - Cabeçalho: **INFANTIL X · DATA · AGENDA**
  - Campos preenchidos com tipografia limpa e linhas divisórias
  - Linha de assinatura quando marcado
- Bordas finas pretas separando blocos, margens otimizadas para impressão caseira
- Blocos vazios ficam em branco (espaço para anotação manual)
- Geração feita no navegador com **jsPDF + html2canvas** (ou pdf-lib), sem servidor

### Backend (Lovable Cloud)

- Tabela `agendas`: turma, semana, blocos (JSON), timestamp
- Tabela `admin_users` para autenticação do painel
- Política pública para inserir agendas (sem login das professoras)
- Acesso restrito ao admin para listar/baixar/excluir

### Assets

- `Logo_Manuelito_preto_oficial.png` (colorida) → `src/assets/logo-colorida.png` para uso nas telas
- `Logo_Manuelito_vazado.png` (preto vazado) → `src/assets/logo-pdf.png` para uso no PDF
