import jsPDF from "jspdf";
import logoUrl from "@/assets/logo-pdf.png";
import { Bloco, blocoEstaVazio, DIAS_SEMANA } from "./turmas";

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

  // Grid 2 colunas x 3 linhas → 5 blocos preenchidos + 1 vazio
  const cols = 2;
  const rows = 3;
  const blockW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const blockH = (pageH - margin * 2 - gap * (rows - 1)) / rows;

  // Layout: 3 à esquerda, 2 à direita → ordem: (0,0),(0,1),(0,2),(1,0),(1,1)
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
  // Borda externa
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

  // Logo
  try {
    doc.addImage(logoData, "PNG", x + 2, y + 2, 10, 10);
  } catch {
    /* noop */
  }

  // Texto cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("AGENDA", x + 14, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(turmaNome.toUpperCase(), x + 14, y + 9.5);

  // Data + dia
  const dia = DIAS_SEMANA[idx] ?? "";
  const dataFmt = formatarData(bloco.data);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const headerRight = `${dia}${dataFmt ? "  ·  " + dataFmt : ""}`;
  const tw = doc.getTextWidth(headerRight);
  doc.text(headerRight, x + w - 2 - tw, y + 9.5);

  if (vazio) {
    // Bloco em branco — apenas linhas de anotação
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    const startY = y + headerH + 6;
    const lineGap = 6;
    for (let i = 0; startY + i * lineGap < y + h - 4; i++) {
      doc.line(x + 4, startY + i * lineGap, x + w - 4, startY + i * lineGap);
    }
    return;
  }

  // Conteúdo
  let cy = y + headerH + 4;
  const innerW = w - 6;
  const px = x + 3;
  const bottomLimit = y + h - 3;

  const drawField = (label: string, value: string, bold = false) => {
    if (!value) return;
    if (cy > bottomLimit - 4) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text(label.toUpperCase(), px, cy);
    cy += 3;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(value, innerW);
    const maxLines = Math.max(1, Math.floor((bottomLimit - cy) / 3.5));
    const used = lines.slice(0, maxLines);
    doc.text(used, px, cy);
    cy += used.length * 3.5 + 1.5;
    // separador
    if (cy < bottomLimit - 2) {
      doc.setDrawColor(230);
      doc.setLineWidth(0.15);
      doc.line(px, cy, px + innerW, cy);
      cy += 2;
    }
  };

  drawField("Disciplina", bloco.disciplina, true);
  drawField("Conteúdo", bloco.conteudo);
  drawField("Atividade de classe", bloco.atividadeClasse);
  drawField("Atividade de casa", bloco.atividadeCasa);
  if (bloco.observacao) drawField("Observação", bloco.observacao);

  // Assinatura — fixa no rodapé
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
