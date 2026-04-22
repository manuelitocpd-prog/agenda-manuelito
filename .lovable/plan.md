
## Renomear arquivos PDF baixados

Hoje os arquivos são salvos como `agenda-infantil-2-2026-04-20.pdf` (slug + data ISO da segunda-feira). Vou padronizar para o formato pedido:

**Novo padrão:** `agenda-Infantil 2 - 20-04 a 24-04.pdf`

- Prefixo fixo `agenda`
- Nome completo da turma (ex: `Infantil 2`, não o slug)
- Intervalo da semana **segunda a sexta** no formato `dd-mm a dd-mm` (sem ano para ficar curto; uso `-` em vez de `/` porque barra não é permitida em nomes de arquivo)

### Onde aplicar

1. **`src/pages/Turma.tsx`** — no envio, ao chamar `doc.save(...)`, gerar o nome a partir de `turma.nome` + data inicial da semana, calculando a sexta-feira (segunda + 4 dias).
2. **`src/pages/TurmaHistorico.tsx`** — mesma lógica usando `agenda.semana_inicio`.
3. **`src/pages/Admin.tsx`** — mesma lógica no botão de baixar do painel admin.

Para evitar duplicação, crio um helper `nomeArquivoPdf(turmaNome, semanaInicioIso)` em `src/lib/turmas.ts` e uso nos três lugares.

### Detalhes técnicos

```ts
// src/lib/turmas.ts
export function nomeArquivoPdf(turmaNome: string, semanaInicioIso: string): string {
  const [y, m, d] = semanaInicioIso.split("-").map(Number);
  const inicio = new Date(y, m - 1, d);
  const fim = new Date(y, m - 1, d + 4); // sexta
  const fmt = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `agenda-${turmaNome} - ${fmt(inicio)} a ${fmt(fim)}.pdf`;
}
```
