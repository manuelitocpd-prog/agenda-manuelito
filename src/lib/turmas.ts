export const TURMAS = [
  { slug: "infantil-2", nome: "Infantil 2", cor: "primary", emoji: "🧸" },
  { slug: "infantil-3", nome: "Infantil 3", cor: "yellow", emoji: "🎨" },
  { slug: "infantil-4", nome: "Infantil 4", cor: "purple", emoji: "🚀" },
  { slug: "infantil-5", nome: "Infantil 5", cor: "green", emoji: "🌟" },
] as const;

export type TurmaSlug = (typeof TURMAS)[number]["slug"];

export function getTurma(slug: string) {
  return TURMAS.find((t) => t.slug === slug);
}

export const DIAS_SEMANA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

export interface Disciplina {
  disciplina: string;
  conteudo: string;
  atividadeClasse: string;
  atividadeCasa: string;
}

export interface Bloco {
  data: string;
  disciplinas: Disciplina[];
  observacao: string;
  incluirAssinatura: boolean;
}

export const disciplinaVazia = (): Disciplina => ({
  disciplina: "",
  conteudo: "",
  atividadeClasse: "",
  atividadeCasa: "",
});

export const blocoVazio = (): Bloco => ({
  data: "",
  disciplinas: [disciplinaVazia()],
  observacao: "",
  incluirAssinatura: false,
});

export function nomearArquivoPdf(turmaNome: string, blocos: Bloco[], semanaInicio: string): string {
  const datas = blocos
    .map((b) => b.data)
    .filter(Boolean)
    .sort();

  const formatar = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  const fallback = semanaInicio ? formatar(semanaInicio) : "??/??";
  const inicio = datas.length > 0 ? formatar(datas[0]) : fallback;
  const fim = datas.length > 0 ? formatar(datas[datas.length - 1]) : fallback;

  return `agenda - ${turmaNome} - ${inicio} a ${fim}.pdf`;
}

export const disciplinaEstaVazia = (d: Disciplina) =>
  !d.disciplina && !d.conteudo && !d.atividadeClasse && !d.atividadeCasa;

export const blocoEstaVazio = (b: Bloco) =>
  !b.data && !b.observacao && b.disciplinas.every(disciplinaEstaVazia);

// Compat: converte formato antigo {disciplina, conteudo, ...} para novo
type BlocoLegacy = {
  data?: string;
  disciplina?: string;
  conteudo?: string;
  atividadeClasse?: string;
  atividadeCasa?: string;
  observacao?: string;
  incluirAssinatura?: boolean;
  disciplinas?: Disciplina[];
};

export function normalizarBloco(raw: unknown): Bloco {
  const b = (raw ?? {}) as BlocoLegacy;
  if (Array.isArray(b.disciplinas) && b.disciplinas.length > 0) {
    return {
      data: b.data ?? "",
      disciplinas: b.disciplinas.map((d) => ({
        disciplina: d.disciplina ?? "",
        conteudo: d.conteudo ?? "",
        atividadeClasse: d.atividadeClasse ?? "",
        atividadeCasa: d.atividadeCasa ?? "",
      })),
      observacao: b.observacao ?? "",
      incluirAssinatura: !!b.incluirAssinatura,
    };
  }
  return {
    data: b.data ?? "",
    disciplinas: [
      {
        disciplina: b.disciplina ?? "",
        conteudo: b.conteudo ?? "",
        atividadeClasse: b.atividadeClasse ?? "",
        atividadeCasa: b.atividadeCasa ?? "",
      },
    ],
    observacao: b.observacao ?? "",
    incluirAssinatura: !!b.incluirAssinatura,
  };
}
