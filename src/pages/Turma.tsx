import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, History, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-colorida.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DIAS_SEMANA,
  blocoEstaVazio,
  blocoVazio,
  disciplinaEstaVazia,
  disciplinaVazia,
  getTurma,
  nomearArquivoPdf,
  type Bloco,
  type Disciplina,
} from "@/lib/turmas";
import { gerarPdfAgenda } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";

const Turma = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const turma = getTurma(slug);

  const [semanaInicio, setSemanaInicio] = useState("");
  const [blocos, setBlocos] = useState<Bloco[]>(() => Array.from({ length: 5 }, blocoVazio));
  const [abertos, setAbertos] = useState<boolean[]>([true, true, true, true, true]);
  const [enviando, setEnviando] = useState(false);

  const blocosPreenchidos = useMemo(() => blocos.filter((b) => !blocoEstaVazio(b)).length, [blocos]);

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

  const updateBloco = (idx: number, patch: Partial<Bloco>) => {
    setBlocos((prev) => {
      const next = prev.map((b, i) => (i === idx ? { ...b, ...patch } : b));
      // Auto-preencher datas dos dias seguintes ao alterar a data do primeiro dia
      if (idx === 0 && patch.data !== undefined && patch.data) {
        const [y, m, d] = patch.data.split("-").map(Number);
        for (let i = 1; i < next.length; i++) {
          const dt = new Date(y, m - 1, d + i);
          const yy = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const dd = String(dt.getDate()).padStart(2, "0");
          next[i] = { ...next[i], data: `${yy}-${mm}-${dd}` };
        }
      }
      return next;
    });
  };

  const updateDisciplina = (bIdx: number, dIdx: number, patch: Partial<Disciplina>) => {
    setBlocos((prev) =>
      prev.map((b, i) =>
        i === bIdx
          ? { ...b, disciplinas: b.disciplinas.map((d, j) => (j === dIdx ? { ...d, ...patch } : d)) }
          : b,
      ),
    );
  };

  const addDisciplina = (bIdx: number) => {
    setBlocos((prev) =>
      prev.map((b, i) => (i === bIdx ? { ...b, disciplinas: [...b.disciplinas, disciplinaVazia()] } : b)),
    );
  };

  const removeDisciplina = (bIdx: number, dIdx: number) => {
    setBlocos((prev) =>
      prev.map((b, i) =>
        i === bIdx ? { ...b, disciplinas: b.disciplinas.filter((_, j) => j !== dIdx) } : b,
      ),
    );
  };

  const toggleBloco = (idx: number) => {
    setAbertos((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handlePreview = async () => {
    if (blocosPreenchidos === 0) {
      toast.error("Preencha ao menos um dia da semana.");
      return;
    }
    const doc = await gerarPdfAgenda({ turmaNome: turma.nome, blocos });
    window.open(doc.output("bloburl"), "_blank");
  };

  const handleEnviar = async () => {
    if (blocosPreenchidos === 0) {
      toast.error("Preencha ao menos um dia da semana.");
      return;
    }
    if (!semanaInicio) {
      toast.error("Informe a data de início da semana.");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.from("agendas").insert({
        turma: turma.nome,
        semana_inicio: semanaInicio,
        blocos: blocos as never,
      });
      if (error) throw error;

      const doc = await gerarPdfAgenda({ turmaNome: turma.nome, blocos });
      doc.save(nomearArquivoPdf(turma.nome, blocos, semanaInicio));

      toast.success("Agenda enviada com sucesso!");
      setTimeout(() => navigate("/"), 1500);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar a agenda. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft pb-24">
      <header className="container pt-6 pb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Colégio Manuelito" className="h-16 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Agenda</p>
              <h1 className="text-2xl md:text-3xl font-bold">{turma.nome}</h1>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
            <Link to={`/turma/${turma.slug}/historico`}>
              <History className="h-4 w-4" /> Ver agendas enviadas
            </Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl">
        <Card className="p-5 mb-5 shadow-card">
          <Label htmlFor="semana" className="font-semibold">Semana iniciando em</Label>
          <Input
            id="semana"
            type="date"
            value={semanaInicio}
            onChange={(e) => setSemanaInicio(e.target.value)}
            className="mt-2 max-w-xs"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Preencha de Segunda a Sexta. Dias em branco ficarão vazios na impressão.
          </p>
        </Card>

        <div className="space-y-4">
          {blocos.map((bloco, idx) => {
            const aberto = abertos[idx];
            const vazio = blocoEstaVazio(bloco);
            const qtdDisc = bloco.disciplinas.filter((d) => !disciplinaEstaVazia(d)).length;
            return (
              <Card key={idx} className="overflow-hidden shadow-card animate-fade-in">
                <button
                  type="button"
                  onClick={() => toggleBloco(idx)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="text-left">
                      <div className="font-semibold">{DIAS_SEMANA[idx]}</div>
                      <div className="text-xs text-muted-foreground">
                        {vazio
                          ? "Sem aula (em branco no PDF)"
                          : `${qtdDisc} disciplina${qtdDisc === 1 ? "" : "s"} preenchida${qtdDisc === 1 ? "" : "s"}`}
                      </div>
                    </div>
                  </div>
                  {aberto ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                {aberto && (
                  <div className="p-5 pt-2 space-y-4 border-t">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={bloco.data}
                        onChange={(e) => updateBloco(idx, { data: e.target.value })}
                        className="mt-1 max-w-xs"
                      />
                    </div>

                    {bloco.disciplinas.map((disc, dIdx) => (
                      <div key={dIdx} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Disciplina {dIdx + 1}
                          </h3>
                          {bloco.disciplinas.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDisciplina(idx, dIdx)}
                              className="h-8 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" /> Remover
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Disciplina</Label>
                          <Input
                            value={disc.disciplina}
                            onChange={(e) => updateDisciplina(idx, dIdx, { disciplina: e.target.value })}
                            placeholder="Ex.: Linguagem"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Conteúdo</Label>
                          <Textarea
                            value={disc.conteudo}
                            onChange={(e) => updateDisciplina(idx, dIdx, { conteudo: e.target.value })}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Atividade de classe</Label>
                          <Textarea
                            value={disc.atividadeClasse}
                            onChange={(e) => updateDisciplina(idx, dIdx, { atividadeClasse: e.target.value })}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Atividade de casa</Label>
                          <Textarea
                            value={disc.atividadeCasa}
                            onChange={(e) => updateDisciplina(idx, dIdx, { atividadeCasa: e.target.value })}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addDisciplina(idx)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4" /> Adicionar disciplina
                    </Button>

                    <div>
                      <Label>Observação (opcional)</Label>
                      <Textarea
                        value={bloco.observacao}
                        onChange={(e) => updateBloco(idx, { observacao: e.target.value })}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={bloco.incluirAssinatura}
                        onCheckedChange={(v) => updateBloco(idx, { incluirAssinatura: !!v })}
                      />
                      <span className="text-sm">Incluir campo de assinatura do responsável</span>
                    </label>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t shadow-elevated">
        <div className="container max-w-3xl py-3 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <p className="text-sm text-muted-foreground">
            {blocosPreenchidos} de 5 dia(s) preenchido(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4" /> Pré-visualizar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando}>
              <Send className="h-4 w-4" /> {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Turma;
