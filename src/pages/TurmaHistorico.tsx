import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-colorida.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTurma, normalizarBloco, type Bloco } from "@/lib/turmas";
import { gerarPdfAgenda } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";

interface AgendaRow {
  id: string;
  turma: string;
  semana_inicio: string;
  blocos: unknown;
  created_at: string;
}

const formatarData = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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

const TurmaHistorico = () => {
  const { slug = "" } = useParams();
  const turma = getTurma(slug);
  const [agendas, setAgendas] = useState<AgendaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

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
        setAgendas((data ?? []) as AgendaRow[]);
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

  const baixar = async (agenda: AgendaRow) => {
    try {
      setBaixandoId(agenda.id);
      const blocos = (Array.isArray(agenda.blocos) ? agenda.blocos : []).map((b) =>
        normalizarBloco(b),
      ) as Bloco[];
      const doc = await gerarPdfAgenda({ turmaNome: turma.nome, blocos });
      doc.save(`agenda-${turma.slug}-${agenda.semana_inicio}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setBaixandoId(null);
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
            {agendas.map((a) => (
              <Card
                key={a.id}
                className="p-4 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">
                    Semana de {formatarData(a.semana_inicio)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Enviada em {formatarDataHora(a.created_at)}
                  </div>
                </div>
                <Button
                  onClick={() => baixar(a)}
                  disabled={baixandoId === a.id}
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  {baixandoId === a.id ? "Gerando…" : "Baixar PDF"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TurmaHistorico;
