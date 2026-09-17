import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Score Ponto — Controle eletrônico de jornada" },
      {
        name: "description",
        content:
          "Plataforma SaaS de controle de jornada, registro de ponto, banco de horas e relatórios para pequenas e médias empresas.",
      },
      { property: "og:title", content: "Score Ponto — Controle eletrônico de jornada" },
      {
        property: "og:description",
        content:
          "Controle jornada, atrasos, horas excedentes e banco de horas em uma plataforma corporativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const destaques = [
  { icon: Clock, titulo: "Jornadas flexíveis", texto: "5x2, 6x1, 12x36, espanhola e estágio." },
  { icon: ShieldCheck, titulo: "Auditoria completa", texto: "Ajustes com histórico e responsável." },
  { icon: BarChart3, titulo: "Indicadores", texto: "Atrasos, excedentes e banco de horas." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Score Ponto</span>
          <Button asChild size="sm">
            <Link to="/auth">Acessar sistema</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Controle eletrônico de jornada para sua empresa
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Registro de ponto, horas trabalhadas, atrasos, horas excedentes e banco de horas em uma
          plataforma corporativa, segura e escalável.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/auth">Criar conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>

        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {destaques.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-lg border border-border bg-card p-6">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 font-medium">{titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
