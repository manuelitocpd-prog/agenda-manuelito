import jsPDF from "jspdf";
import logoUrl from "@/assets/logo-pdf.png";
import { Bloco, blocoEstaVazio, disciplinaEstaVazia, DIAS_SEMANA } from "./turmas";

let cachedLogo: string | null = null;
async function loadLogo(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  const res = await fetch(logoUrl);
  const blob = await res.blob();
  cachedLogo = await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
  return cachedLogo;
}

function formatarData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface PdfArgs {
  turmaNome: string;
  blocos: Bloco[];
}

export async function gerarPdfAgenda({ turmaNome, blocos }: PdfArgs): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = await loadLogo();

  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const gap = 4;

  const cols = 2;
  const rows = 3;
  const blockW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const blockH = (pageH - margin * 2 - gap * (rows - 1)) / rows;

  // 3 à esquerda, 2 à direita
  const positions = [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: 2 },
    { col: 1, row: 0 },
    { col: 1, row: 1 },
  ];

  blocos.slice(0, 5).forEach((bloco, idx) => {
    const { col, row } = positions[idx];
    const x = margin + col * (blockW + gap);
    const y = margin + row * (blockH + gap);
    desenharBloco(doc, x, y, blockW, blockH, bloco, idx, turmaNome, logo);
  });

  return doc;
}

const FONT_BASE = 11;
const FONT_MIN = 7;

// Constantes compartilhadas entre medição e renderização
function lineHeight(fontPt: number): number {
  return fontPt * 0.3528 * 1.18;
}
function labelHeight(fontPt: number): number {
  // labels usam ~ fontPt - 2.5
  const lblPt = Math.max(7, fontPt - 2.5);
  return lblPt * 0.3528 * 1.1;
}
const GAP_LABEL_VALOR = (fontPt: number) => labelHeight(fontPt) * 0.55 + 0.6;
const GAP_APOS_VALOR = (fontPt: number) => lineHeight(fontPt) * 0.55;
const GAP_SEPARADOR = (fontPt: number) => lineHeight(fontPt) * 0.9 + 1.2;

function desenharBloco(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  bloco: Bloco,
  idx: number,
  turmaNome: string,
  logoData: string,
) {
  // Borda
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);

  const vazio = blocoEstaVazio(bloco);

  // Cabeçalho
  const headerH = 14;
  doc.setFillColor(245, 245, 245);
  doc.rect(x, y, w, headerH, "F");
  doc.setLineWidth(0.3);
  doc.line(x, y + headerH, x + w, y + headerH);

  try {
    doc.addImage(logoData, "PNG", x + 2, y + 2, 10, 10);
  } catch {
    /* noop */
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("AGENDA", x + 14, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(turmaNome.toUpperCase(), x + 14, y + 9.5);

  const dia = DIAS_SEMANA[idx] ?? "";
  const dataFmt = formatarData(bloco.data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const headerRight = `${dia}${dataFmt ? "  ·  " + dataFmt : ""}`;
  const tw = doc.getTextWidth(headerRight);
  doc.text(headerRight, x + w - 2 - tw, y + 9.5);

  if (vazio) {
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    const startY = y + headerH + 6;
    const lineGap = 6;
    for (let i = 0; startY + i * lineGap < y + h - 4; i++) {
      doc.line(x + 4, startY + i * lineGap, x + w - 4, startY + i * lineGap);
    }
    return;
  }

  const contentTop = y + headerH + 3;
  const contentBottom = bloco.incluirAssinatura ? y + h - 9 : y + h - 3;
  const innerW = w - 6;
  const px = x + 3;

  // Shrink-to-fit com 1mm de folga de segurança
  const espacoDisp = contentBottom - contentTop - 1;
  let chosen = FONT_MIN;
  for (let f = FONT_BASE; f >= FONT_MIN; f--) {
    if (medirAltura(doc, bloco, innerW, f) <= espacoDisp) {
      chosen = f;
      break;
    }
    chosen = f;
  }

  renderizarConteudo(doc, bloco, px, contentTop, innerW, contentBottom, chosen);

  if (bloco.incluirAssinatura) {
    const sigY = y + h - 6;
    doc.setDrawColor(120);
    doc.setLineWidth(0.3);
    doc.line(px, sigY, px + innerW * 0.8, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80);
    doc.text("Assinatura do responsável", px, sigY + 3);
  }
}

interface Campo {
  label: string;
  value: string;
}

function camposDoBloco(bloco: Bloco): Array<Campo | "sep"> {
  const out: Array<Campo | "sep"> = [];
  const validas = bloco.disciplinas.filter((d) => !disciplinaEstaVazia(d));
  validas.forEach((d, i) => {
    if (i > 0) out.push("sep");
    if (d.disciplina) out.push({ label: "Disciplina", value: d.disciplina });
    if (d.conteudo) out.push({ label: "Conteúdo", value: d.conteudo });
    if (d.atividadeClasse) out.push({ label: "Atividade de classe", value: d.atividadeClasse });
    if (d.atividadeCasa) out.push({ label: "Atividade de casa", value: d.atividadeCasa });
  });
  if (bloco.observacao) {
    if (out.length) out.push("sep");
    out.push({ label: "Observação", value: bloco.observacao });
  }
  return out;
}

// Quebra palavras gigantes para o jsPDF não estourar a largura
function quebrarPalavrasLongas(texto: string, max = 25): string {
  return texto
    .split(/(\s+)/)
    .map((parte) => {
      if (/\s/.test(parte) || parte.length <= max) return parte;
      const partes: string[] = [];
      for (let i = 0; i < parte.length; i += max) {
        partes.push(parte.slice(i, i + max));
      }
      return partes.join(" ");
    })
    .join("");
}

function medirAltura(doc: jsPDF, bloco: Bloco, innerW: number, fontPt: number): number {
  const itens = camposDoBloco(bloco);
  const lh = lineHeight(fontPt);
  const lblH = labelHeight(fontPt);
  let total = lblH * 0.2; // pequeno topo (offset baseline)
  for (const it of itens) {
    if (it === "sep") {
      total += GAP_SEPARADOR(fontPt);
      continue;
    }
    total += lblH; // label
    total += GAP_LABEL_VALOR(fontPt); // gap label→valor
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontPt);
    const txt = quebrarPalavrasLongas(it.value);
    const lines = doc.splitTextToSize(txt, innerW) as string[];
    total += lines.length * lh; // valor
    total += GAP_APOS_VALOR(fontPt); // espaço após valor
  }
  return total;
}

function renderizarConteudo(
  doc: jsPDF,
  bloco: Bloco,
  px: number,
  startY: number,
  innerW: number,
  bottomLimit: number,
  fontPt: number,
) {
  const itens = camposDoBloco(bloco);
  const lh = lineHeight(fontPt);
  const lblH = labelHeight(fontPt);
  let cy = startY + lblH * 0.8; // baseline do primeiro label

  for (const it of itens) {
    if (it === "sep") {
      const sepY = cy - lh * 0.4;
      if (sepY > bottomLimit) return;
      doc.setDrawColor(210);
      doc.setLineWidth(0.2);
      doc.line(px, sepY, px + innerW, sepY);
      cy += GAP_SEPARADOR(fontPt) - lh * 0.4;
      continue;
    }
    if (cy > bottomLimit) return;

    // Label em negrito
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(7, fontPt - 2.5));
    doc.setTextColor(60);
    doc.text(it.label.toUpperCase(), px, cy);

    // Avança até a baseline do valor (label inteiro abaixo + gap)
    cy += GAP_LABEL_VALOR(fontPt) + lh * 0.85;

    // Valor
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontPt);
    doc.setTextColor(20);
    const txt = quebrarPalavrasLongas(it.value);
    const lines = doc.splitTextToSize(txt, innerW) as string[];
    const maxLines = Math.max(0, Math.floor((bottomLimit - cy + lh) / lh));
    const used = lines.slice(0, maxLines);
    if (used.length === 0) return;
    doc.text(used, px, cy);
    cy += (used.length - 1) * lh + GAP_APOS_VALOR(fontPt) + lh * 0.85;
  }
}
