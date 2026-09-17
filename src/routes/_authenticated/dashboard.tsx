import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Score Ponto" },
      { name: "description", content: "Visão geral da jornada e da configuração da empresa." },
      { property: "og:title", content: "Dashboard — Score Ponto" },
      { property: "og:description", content: "Visão geral da jornada e da configuração da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["perfil-atual"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const [{ data: perfil }, { data: papeis }] = await Promise.all([
        supabase.from("profiles").select("nome, email, empresa_id").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      return { perfil, papeis: papeis ?? [] };
    },
  });

  const cards = [
    { titulo: "Funcionários", valor: "—", nota: "Fase 2" },
    { titulo: "Jornadas cadastradas", valor: "—", nota: "Fase 2" },
    { titulo: "Registros hoje", valor: "—", nota: "Fase 3" },
    { titulo: "Saldo banco de horas", valor: "—", nota: "Fase 4" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Carregando perfil..."
            : `${data?.perfil?.nome || data?.perfil?.email || "Usuário"} · perfil: ${
                data?.papeis.map((p) => p.role).join(", ") || "sem perfil"
              }`}
        </p>
      </div>

      {!isLoading && !data?.perfil?.empresa_id && (
        <div className="rounded-lg border border-border bg-accent/40 p-4 text-sm">
          Nenhuma empresa vinculada ainda. O cadastro de empresa entra na Fase 2.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.titulo} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.titulo}</p>
            <p className="mt-2 text-2xl font-semibold">{c.valor}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.nota}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Próximo passo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fase 2: cadastro de empresa, funcionários e jornadas.
        </p>
      </div>
    </div>
  );
}
