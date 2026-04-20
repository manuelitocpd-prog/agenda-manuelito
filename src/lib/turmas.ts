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

export interface Bloco {
  data: string;
  disciplina: string;
  conteudo: string;
  atividadeClasse: string;
  atividadeCasa: string;
  observacao: string;
  incluirAssinatura: boolean;
}

export const blocoVazio = (): Bloco => ({
  data: "",
  disciplina: "",
  conteudo: "",
  atividadeClasse: "",
  atividadeCasa: "",
  observacao: "",
  incluirAssinatura: false,
});

export const blocoEstaVazio = (b: Bloco) =>
  !b.data && !b.disciplina && !b.conteudo && !b.atividadeClasse && !b.atividadeCasa && !b.observacao;
