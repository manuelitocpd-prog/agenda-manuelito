import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { gerarPdfAgenda } from "@/lib/pdf";
import type { Bloco } from "@/lib/turmas";
import logo from "@/assets/logo-colorida.png";

interface AgendaRow {
  id: string;
  turma: string;
  semana_inicio: string;
  blocos: Bloco[];
  created_at: string;
}

const Admin = () => {
  const [session, setSession] = useState<unknown>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [agendas, setAgendas] = useState<AgendaRow[]>([]);
  const [filtroTurma, setFiltroTurma] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data: r }) => {
            setIsAdmin(!!r);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void carregar();
  }, [isAdmin]);

  const carregar = async () => {
    const { data, error } = await supabase
      .from("agendas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar agendas");
      return;
    }
    setAgendas((data ?? []) as unknown as AgendaRow[]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Credenciais inválidas");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  const baixar = async (a: AgendaRow) => {
    const doc = await gerarPdfAgenda({ turmaNome: a.turma, blocos: a.blocos });
    doc.save(`agenda-${a.turma}-${a.semana_inicio}.pdf`);
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta agenda?")) return;
    const { error } = await supabase.from("agendas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Agenda excluída");
    void carregar();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <Card className="p-8 w-full max-w-sm shadow-elevated">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="Colégio Manuelito" className="h-16 w-auto mb-3" />
            <h1 className="text-xl font-bold">Acesso administrativo</h1>
            <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </Button>
            {session && !isAdmin && (
              <p className="text-xs text-destructive text-center">
                Esta conta não tem permissão de administrador.
              </p>
            )}
          </form>
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-primary mt-6">
            ← Voltar ao site
          </Link>
        </Card>
      </div>
    );
  }

  const filtradas = filtroTurma
    ? agendas.filter((a) => a.turma.toLowerCase().includes(filtroTurma.toLowerCase()))
    : agendas;

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </header>

      <main className="container max-w-5xl pb-12">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="" className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-bold">Painel administrativo</h1>
            <p className="text-sm text-muted-foreground">Histórico de agendas enviadas</p>
          </div>
        </div>

        <Card className="p-4 mb-4">
          <Label>Filtrar por turma</Label>
          <Input
            placeholder="Ex.: Infantil 3"
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="mt-1 max-w-sm"
          />
        </Card>

        {filtradas.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Nenhuma agenda encontrada.</Card>
        ) : (
          <div className="space-y-3">
            {filtradas.map((a) => (
              <Card key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.turma}</div>
                  <div className="text-sm text-muted-foreground">
                    Semana de {new Date(a.semana_inicio + "T00:00:00").toLocaleDateString("pt-BR")} ·
                    Enviada em {new Date(a.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => baixar(a)}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => excluir(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
