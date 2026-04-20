import { Link } from "react-router-dom";
import logo from "@/assets/logo-colorida.png";
import { TURMAS } from "@/lib/turmas";
import { Card } from "@/components/ui/card";

const corClasses: Record<string, string> = {
  primary: "bg-primary-soft border-primary/30 hover:border-primary text-primary",
  yellow: "bg-accent-yellow/10 border-accent-yellow/40 hover:border-accent-yellow text-foreground",
  purple: "bg-accent-purple/10 border-accent-purple/40 hover:border-accent-purple text-accent-purple",
  green: "bg-accent-green/10 border-accent-green/40 hover:border-accent-green text-accent-green",
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="container py-10 flex flex-col items-center text-center animate-fade-in">
        <img src={logo} alt="Colégio Manuelito" className="h-28 md:h-36 w-auto" />
        <h1 className="mt-6 text-3xl md:text-4xl font-bold text-foreground">
          Agendas — Educação Infantil
        </h1>
        <p className="mt-2 text-muted-foreground max-w-xl">
          Selecione a turma para preencher a agenda da semana.
        </p>
      </header>

      <main className="container pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {TURMAS.map((t) => (
            <Link key={t.slug} to={`/turma/${t.slug}`}>
              <Card
                className={`p-6 h-44 flex flex-col items-center justify-center text-center border-2 transition-all hover:shadow-elevated hover:-translate-y-1 cursor-pointer ${corClasses[t.cor]}`}
              >
                <span className="text-4xl mb-3">{t.emoji}</span>
                <span className="text-xl font-bold text-foreground">{t.nome}</span>
                <span className="text-xs text-muted-foreground mt-1">Preencher agenda</span>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="container pb-8 text-center">
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Acesso administrativo
        </Link>
      </footer>
    </div>
  );
};

export default Index;
