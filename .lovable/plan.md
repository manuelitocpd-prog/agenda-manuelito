
## Quatro ajustes: nome de arquivo, edição no histórico, PNG por dia e favicon

### 1. Helper de nome de arquivo PDF
Em `src/lib/turmas.ts`, adicionar `nomearArquivoPdf(turmaNome, blocos, semanaInicio)` que retorna `agenda - {Turma} - {dd/mm} a {dd/mm}.pdf`, usando a primeira/última `data` preenchida nos blocos (ordenada) ou `semana_inicio` como fallback.

Aplicar em todos os `doc.save(...)`:
- `src/pages/Turma.tsx` (linha 108)
- `src/pages/TurmaHistorico.tsx`
- `src/pages/Admin.tsx` (linha 101)

### 2. Visualizar e editar agendas no histórico
Reescrever `src/pages/TurmaHistorico.tsx` para que cada card tenha dois botões: **Ver agenda / Ocultar** (ícone Eye) e **PDF** (Download).

Ao expandir, percorre os 5 dias da semana exibindo apenas dias não-vazios, com nome do dia (`DIAS_SEMANA[i]`) + data formatada `dd/mm`, e para cada disciplina não-vazia: Disciplina, Conteúdo, Atividade de classe, Atividade de casa. Observação do dia ao final.

**Regra de prazo:** calcula sexta = `semana_inicio + 4 dias`. Se hoje (local) ≤ sexta → editável; senão → somente leitura.

- **Editável:** badge verde "Semana em andamento — edição permitida". Campos viram `Input`/`Textarea` (mesmo layout do `Turma.tsx`). Botão **Salvar alterações** no rodapé do card faz `UPDATE` em `agendas` filtrando por `id`, atualizando `blocos`. Toast de sucesso/erro, estado local atualizado.
- **Somente leitura:** badge cinza "Semana encerrada — somente leitura". Campos como texto puro.

**Ajuste de banco necessário:** a tabela `agendas` hoje só tem INSERT público e SELECT/DELETE para admin — **não há policy de UPDATE**. Vou adicionar migração:
```sql
CREATE POLICY "Atualização pública das agendas"
  ON public.agendas FOR UPDATE
  TO public USING (true) WITH CHECK (true);
```
(Mesmo nível dos demais acessos públicos já existentes para essa tabela.)

### 3. PNG por dia (dentro do card expandido)
Instalar `html2canvas`. Para cada dia exibido no modo expandido, botão pequeno com ícone `Camera` ao lado do cabeçalho do dia.

Ao clicar:
- Renderiza um `<div>` oculto (`position: absolute; left: -9999px; width: 600px; padding: 32px; background: white`) contendo: cabeçalho com `<img src={logo}>` + nome da turma + dia + data; corpo com cada disciplina (campos vazios omitidos) separados por linha; rodapé com observação.
- Logo importada normalmente de `@/assets/logo-colorida.png` (Vite resolve para URL — html2canvas baixa via `useCORS`).
- `html2canvas(elemento)` → `canvas.toDataURL("image/png")` → download via `<a download>`.
- Nome: `imagem - {Turma} - {Dia} - {dd/mm}.png`.
- Limpa o elemento oculto após captura.

Funciona tanto em modo editável quanto somente leitura — usa o estado local atual (já refletindo edições não salvas? Não — usa o estado salvo do card, para evitar confusão). Decisão: usa o estado atual em memória do card (rascunho), assim o que a professora vê é o que sai no PNG.

### 4. Favicon
- Copiar `src/assets/logo-colorida.png` para `public/favicon.png`.
- Remover `public/favicon.ico` (browser pede por padrão e sobrescreveria).
- Em `index.html`, adicionar dentro do `<head>`:
  ```html
  <link rel="icon" type="image/png" href="/favicon.png" />
  ```

### Detalhes técnicos resumidos
- **Arquivos editados:** `src/lib/turmas.ts`, `src/pages/Turma.tsx`, `src/pages/TurmaHistorico.tsx`, `src/pages/Admin.tsx`, `index.html`.
- **Arquivos criados:** `public/favicon.png` (cópia), nova migração SQL para policy de UPDATE.
- **Arquivos removidos:** `public/favicon.ico`.
- **Dependência nova:** `html2canvas`.
- **Schema:** sem mudança de tabelas, só nova RLS policy de UPDATE público em `agendas`.
- **Sem novas rotas.**
