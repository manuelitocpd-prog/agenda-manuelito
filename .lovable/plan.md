## Ajustes: disciplinas por turma + correção do layout do PDF

### 1. Disciplinas por turma (não globais)

**Tabela `disciplinas`** com coluna `turma` (slug):
```sql
CREATE TABLE public.disciplinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma, nome)
);
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de disciplinas"
  ON public.disciplinas FOR SELECT TO public USING (true);

CREATE POLICY "Admin gerencia disciplinas"
  ON public.disciplinas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

**Admin (`/admin`)** — nova seção "Disciplinas por turma":
- Seletor da turma (Infantil 2/3/4/5).
- Lista as disciplinas daquela turma, com input + botão **Adicionar** e lixeira para remover.
- Cada disciplina pertence a uma turma específica.

**Professora (`Turma.tsx` e edição em `TurmaHistorico.tsx`)**:
- Ao montar, carrega só as disciplinas da turma corrente (`WHERE turma = slug`).
- Campo "Disciplina" vira combobox (`Popover` + `Command`) — escolhe da lista OU digita texto livre.

**Novo componente:** `src/components/DisciplinaCombobox.tsx`.

### 2. Corrigir layout do PDF (texto sobrepondo títulos)

Problema atual em `src/lib/pdf.ts` (`renderizarConteudo`): o avanço vertical após o label está pequeno (`0.6 + lh * 0.5`), fazendo o valor da próxima linha colidir/sobrepor o título da seção quando a fonte encolhe.

**Correções no algoritmo de renderização e medição:**

- **Espaçamento label → valor:** aumentar de `0.6 + lh * 0.5` para `lblH + 1.2` (gap proporcional ao tamanho do label, garantindo que o valor sempre comece abaixo do label).
- **Espaçamento valor → próximo bloco:** aumentar de `1.2` para `lh * 0.6` (mais ar entre seções).
- **Separador entre disciplinas:** aumentar a folga de `lh * 0.4 + 1` para `lh * 0.8 + 1.5`, e desenhar a linha em `cy - lh * 0.5` para não encostar no texto anterior.
- **Sincronizar `medirAltura` com a renderização** — extrair constantes (`GAP_LABEL_VALOR`, `GAP_APOS_VALOR`, `GAP_SEPARADOR`) e usar as mesmas nas duas funções, para o shrink-to-fit não escolher uma fonte que cabe na medição mas estoura na renderização.
- **Ponto de partida do conteúdo:** usar `cy = startY + lblH * 0.8` (o `text` do jsPDF usa baseline).
- **Margem de segurança no shrink-to-fit:** considerar `contentBottom - contentTop - 1` (1mm de folga).
- **Quebra de palavras longas:** pré-processar o texto inserindo quebras em palavras > 25 caracteres para evitar overflow horizontal.

Resultado: títulos (DISCIPLINA / CONTEÚDO / ATIVIDADE…) sempre acima do respectivo valor, sem sobreposição, com espaçamento consistente.

### Arquivos
- **Editados:** `src/pages/Admin.tsx`, `src/pages/Turma.tsx`, `src/pages/TurmaHistorico.tsx`, `src/lib/pdf.ts`.
- **Criados:** `src/components/DisciplinaCombobox.tsx`, nova migração SQL.
- **Sem mudanças** em rotas ou outras tabelas.