import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Download, Eye, EyeOff, FileText, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import logo from "@/assets/logo-colorida.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DIAS_SEMANA,
  disciplinaEstaVazia,
  disciplinaVazia,
  getTurma,
  nomearArquivoPdf,
  normalizarBloco,
  type Bloco,
  type Disciplina,
} from "@/lib/turmas";
import { gerarPdfAgenda } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";

interface AgendaRow {
  id: string;
  turma: string;
  semana_inicio: string;
  blocos: Bloco[];
  created_at: string;
}

const formatarData = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const formatarDataCurta = (iso: string) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

const formatarDataHora = (iso: string) => {
  const dt = new Date(iso);
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Calcula sexta-feira (semana_inicio + 4 dias) e compara com hoje no fuso local
const dentroDoPrazo = (semanaInicioIso: string): boolean => {
  const [y, m, d] = semanaInicioIso.split("-").map(Number);
  const sexta = new Date(y, m - 1, d + 4);
  sexta.setHours(23, 59, 59, 999);
  return new Date() <= sexta;
};

const TurmaHistorico = () => {
  const { slug = "" } = useParams();
  const turma = getTurma(slug);
  const [agendas, setAgendas] = useState<AgendaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<Record<string, Bloco[]>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!turma) return;
      setCarregando(true);
      const { data, error } = await supabase
        .from("agendas")
        .select("id, turma, semana_inicio, blocos, created_at")
        .eq("turma", turma.nome)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.error(error);
        toast.error("Erro ao carregar histórico.");
      } else {
        const linhas = (data ?? []).map((row) => ({
          ...row,
          blocos: (Array.isArray(row.blocos) ? row.blocos : []).map((b) =>
            normalizarBloco(b),
          ),
        })) as AgendaRow[];
        setAgendas(linhas);
      }
      setCarregando(false);
    };
    carregar();
  }, [turma]);

  if (!turma) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Turma não encontrada.</p>
          <Button asChild><Link to="/">Voltar</Link></Button>
        </div>
      </div>
    );
  }

  const baixarPdf = async (agenda: AgendaRow) => {
    try {
      setBaixandoId(agenda.id);
      const blocos = rascunhos[agenda.id] ?? agenda.blocos;
      const doc = await gerarPdfAgenda({ turmaNome: turma.nome, blocos });
      doc.save(nomearArquivoPdf(turma.nome, blocos, agenda.semana_inicio));
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setBaixandoId(null);
    }
  };

  const toggleExpandir = (agenda: AgendaRow) => {
    if (expandidoId === agenda.id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(agenda.id);
    setRascunhos((prev) =>
      prev[agenda.id] ? prev : { ...prev, [agenda.id]: agenda.blocos.map((b) => ({ ...b, disciplinas: b.disciplinas.map((d) => ({ ...d })) })) },
    );
  };

  const updateBloco = (agendaId: string, bIdx: number, patch: Partial<Bloco>) => {
    setRascunhos((prev) => ({
      ...prev,
      [agendaId]: prev[agendaId].map((b, i) => (i === bIdx ? { ...b, ...patch } : b)),
    }));
  };

  const updateDisciplina = (
    agendaId: string,
    bIdx: number,
    dIdx: number,
    patch: Partial<Disciplina>,
  ) => {
    setRascunhos((prev) => ({
      ...prev,
      [agendaId]: prev[agendaId].map((b, i) =>
        i === bIdx
          ? { ...b, disciplinas: b.disciplinas.map((d, j) => (j === dIdx ? { ...d, ...patch } : d)) }
          : b,
      ),
    }));
  };

  const addDisciplina = (agendaId: string, bIdx: number) => {
    setRascunhos((prev) => ({
      ...prev,
      [agendaId]: prev[agendaId].map((b, i) =>
        i === bIdx ? { ...b, disciplinas: [...b.disciplinas, disciplinaVazia()] } : b,
      ),
    }));
  };

  const removeDisciplina = (agendaId: string, bIdx: number, dIdx: number) => {
    setRascunhos((prev) => ({
      ...prev,
      [agendaId]: prev[agendaId].map((b, i) =>
        i === bIdx ? { ...b, disciplinas: b.disciplinas.filter((_, j) => j !== dIdx) } : b,
      ),
    }));
  };

  const salvar = async (agenda: AgendaRow) => {
    const novosBlocos = rascunhos[agenda.id];
    if (!novosBlocos) return;
    setSalvandoId(agenda.id);
    const { error } = await supabase
      .from("agendas")
      .update({ blocos: novosBlocos as never })
      .eq("id", agenda.id);
    setSalvandoId(null);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar alterações.");
      return;
    }
    setAgendas((prev) =>
      prev.map((a) => (a.id === agenda.id ? { ...a, blocos: novosBlocos } : a)),
    );
    toast.success("Alterações salvas!");
  };

  const baixarPng = async (
    agenda: AgendaRow,
    bloco: Bloco,
    diaNome: string,
  ) => {
    const node = captureRef.current;
    if (!node) return;
    // Renderiza conteúdo do dia em DOM puro (sem React) para captura
    node.innerHTML = "";
    node.style.cssText =
      "position:absolute;left:-9999px;top:0;width:600px;padding:32px;background:#ffffff;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;box-sizing:border-box;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:16px;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px;";
    const img = document.createElement("img");
    img.src = logo;
    img.style.cssText = "height:64px;width:auto;";
    img.crossOrigin = "anonymous";
    header.appendChild(img);
    const headTxt = document.createElement("div");
    headTxt.innerHTML = `<div style="font-size:20px;font-weight:700;line-height:1.2;">${turma.nome}</div><div style="font-size:14px;color:#6b7280;margin-top:4px;">${diaNome}${bloco.data ? " — " + formatarData(bloco.data) : ""}</div>`;
    header.appendChild(headTxt);
    node.appendChild(header);

    bloco.disciplinas
      .filter((d) => !disciplinaEstaVazia(d))
      .forEach((d, i, arr) => {
        const sec = document.createElement("div");
        sec.style.cssText = `padding:12px 0;${i < arr.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}`;
        const linhas: string[] = [];
        if (d.disciplina) linhas.push(`<div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:6px;">${escapeHtml(d.disciplina)}</div>`);
        const campo = (label: string, val: string) =>
          val ? `<div style="margin-top:6px;"><span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">${label}</span><div style="font-size:14px;line-height:1.4;margin-top:2px;white-space:pre-wrap;">${escapeHtml(val)}</div></div>` : "";
        linhas.push(campo("Conteúdo", d.conteudo));
        linhas.push(campo("Atividade de classe", d.atividadeClasse));
        linhas.push(campo("Atividade de casa", d.atividadeCasa));
        sec.innerHTML = linhas.join("");
        node.appendChild(sec);
      });

    if (bloco.observacao) {
      const obs = document.createElement("div");
      obs.style.cssText = "margin-top:16px;padding-top:12px;border-top:1px dashed #d1d5db;";
      obs.innerHTML = `<span style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">Observação</span><div style="font-size:14px;line-height:1.4;margin-top:4px;white-space:pre-wrap;">${escapeHtml(bloco.observacao)}</div>`;
      node.appendChild(obs);
    }

    try {
      // espera logo carregar
      if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
      const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `imagem - ${turma.nome} - ${diaNome} - ${formatarDataCurta(bloco.data) || formatarDataCurta(agenda.semana_inicio)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar imagem.");
    } finally {
      node.innerHTML = "";
      node.style.cssText = "position:absolute;left:-9999px;top:0;";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-12">
      <header className="container pt-6 pb-4">
        <Link
          to={`/turma/${turma.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para a turma
        </Link>
        <div className="flex items-center gap-4">
          <img src={logo} alt="Colégio Manuelito" className="h-16 w-auto" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Agendas enviadas
            </p>
            <h1 className="text-2xl md:text-3xl font-bold">{turma.nome}</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl">
        {carregando ? (
          <Card className="p-8 text-center text-muted-foreground shadow-card">
            Carregando…
          </Card>
        ) : agendas.length === 0 ? (
          <Card className="p-8 text-center shadow-card">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma agenda enviada ainda para esta turma.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground px-1">
              Mostrando as {agendas.length} agenda{agendas.length === 1 ? "" : "s"} mais recente{agendas.length === 1 ? "" : "s"}.
            </p>
            {agendas.map((a) => {
              const expandida = expandidoId === a.id;
              const editavel = dentroDoPrazo(a.semana_inicio);
              const blocosExibidos = rascunhos[a.id] ?? a.blocos;
              return (
                <Card key={a.id} className="shadow-card overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        Semana de {formatarData(a.semana_inicio)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Enviada em {formatarDataHora(a.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpandir(a)}
                      >
                        {expandida ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {expandida ? "Ocultar" : "Ver agenda"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => baixarPdf(a)}
                        disabled={baixandoId === a.id}
                      >
                        <Download className="h-4 w-4" />
                        {baixandoId === a.id ? "Gerando…" : "PDF"}
                      </Button>
                    </div>
                  </div>

                  {expandida && (
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {editavel ? (
                          <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                            Semana em andamento — edição permitida
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Semana encerrada — somente leitura
                          </Badge>
                        )}
                      </div>

                      {blocosExibidos.map((bloco, bIdx) => {
                        const diaNome = DIAS_SEMANA[bIdx] ?? `Dia ${bIdx + 1}`;
                        const temConteudo =
                          editavel ||
                          !!bloco.data ||
                          !!bloco.observacao ||
                          bloco.disciplinas.some((d) => !disciplinaEstaVazia(d));
                        if (!temConteudo) return null;

                        return (
                          <div key={bIdx} className="rounded-lg border bg-card p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div>
                                <div className="font-semibold">{diaNome}</div>
                                {bloco.data && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatarData(bloco.data)}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => baixarPng(a, bloco, diaNome)}
                                title="Baixar imagem deste dia"
                              >
                                <Camera className="h-4 w-4" />
                                PNG
                              </Button>
                            </div>

                            {editavel && (
                              <div className="mb-3">
                                <Label>Data</Label>
                                <Input
                                  type="date"
                                  value={bloco.data}
                                  onChange={(e) =>
                                    updateBloco(a.id, bIdx, { data: e.target.value })
                                  }
                                  className="mt-1 max-w-xs"
                                />
                              </div>
                            )}

                            <div className="space-y-3">
                              {bloco.disciplinas.map((disc, dIdx) => {
                                if (!editavel && disciplinaEstaVazia(disc)) return null;
                                if (editavel) {
                                  return (
                                    <div
                                      key={dIdx}
                                      className="rounded-lg border bg-muted/30 p-3 space-y-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold">
                                          Disciplina {dIdx + 1}
                                        </h4>
                                        {bloco.disciplinas.length > 1 && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeDisciplina(a.id, bIdx, dIdx)}
                                            className="h-8 px-2 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      <div>
                                        <Label>Disciplina</Label>
                                        <Input
                                          value={disc.disciplina}
                                          onChange={(e) =>
                                            updateDisciplina(a.id, bIdx, dIdx, {
                                              disciplina: e.target.value,
                                            })
                                          }
                                          className="mt-1"
                                        />
                                      </div>
                                      <div>
                                        <Label>Conteúdo</Label>
                                        <Textarea
                                          value={disc.conteudo}
                                          onChange={(e) =>
                                            updateDisciplina(a.id, bIdx, dIdx, {
                                              conteudo: e.target.value,
                                            })
                                          }
                                          rows={2}
                                          className="mt-1"
                                        />
                                      </div>
                                      <div>
                                        <Label>Atividade de classe</Label>
                                        <Textarea
                                          value={disc.atividadeClasse}
                                          onChange={(e) =>
                                            updateDisciplina(a.id, bIdx, dIdx, {
                                              atividadeClasse: e.target.value,
                                            })
                                          }
                                          rows={2}
                                          className="mt-1"
                                        />
                                      </div>
                                      <div>
                                        <Label>Atividade de casa</Label>
                                        <Textarea
                                          value={disc.atividadeCasa}
                                          onChange={(e) =>
                                            updateDisciplina(a.id, bIdx, dIdx, {
                                              atividadeCasa: e.target.value,
                                            })
                                          }
                                          rows={2}
                                          className="mt-1"
                                        />
                                      </div>
                                    </div>
                                  );
                                }
                                // Somente leitura
                                return (
                                  <div
                                    key={dIdx}
                                    className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm"
                                  >
                                    {disc.disciplina && (
                                      <div className="font-semibold">{disc.disciplina}</div>
                                    )}
                                    {disc.conteudo && (
                                      <div>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                          Conteúdo
                                        </span>
                                        <div className="whitespace-pre-wrap">{disc.conteudo}</div>
                                      </div>
                                    )}
                                    {disc.atividadeClasse && (
                                      <div>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                          Atividade de classe
                                        </span>
                                        <div className="whitespace-pre-wrap">{disc.atividadeClasse}</div>
                                      </div>
                                    )}
                                    {disc.atividadeCasa && (
                                      <div>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                          Atividade de casa
                                        </span>
                                        <div className="whitespace-pre-wrap">{disc.atividadeCasa}</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {editavel && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addDisciplina(a.id, bIdx)}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4" /> Adicionar disciplina
                                </Button>
                              )}

                              {editavel ? (
                                <div>
                                  <Label>Observação</Label>
                                  <Textarea
                                    value={bloco.observacao}
                                    onChange={(e) =>
                                      updateBloco(a.id, bIdx, { observacao: e.target.value })
                                    }
                                    rows={2}
                                    className="mt-1"
                                  />
                                </div>
                              ) : (
                                bloco.observacao && (
                                  <div className="text-sm">
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                      Observação
                                    </span>
                                    <div className="whitespace-pre-wrap">{bloco.observacao}</div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {editavel && (
                        <div className="flex justify-end pt-2 border-t">
                          <Button
                            onClick={() => salvar(a)}
                            disabled={salvandoId === a.id}
                          >
                            <Save className="h-4 w-4" />
                            {salvandoId === a.id ? "Salvando…" : "Salvar alterações"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Container oculto para captura PNG */}
      <div ref={captureRef} aria-hidden style={{ position: "absolute", left: "-9999px", top: 0 }} />
    </div>
  );
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default TurmaHistorico;
