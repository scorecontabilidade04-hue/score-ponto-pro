import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Building2, Users, CalendarClock, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menu = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ativo: true },
  { to: "/dashboard", label: "Empresa", icon: Building2, ativo: false },
  { to: "/dashboard", label: "Funcionários", icon: Users, ativo: false },
  { to: "/dashboard", label: "Jornadas", icon: CalendarClock, ativo: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-4 text-base font-semibold">
          Score Ponto
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menu.map(({ to, label, icon: Icon, ativo }) =>
            ativo ? (
              <Link
                key={label}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                  pathname === to && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ) : (
              <span
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm opacity-50"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </span>
            ),
          )}
        </nav>
        <div className="p-3">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={sair}>
            <LogOut className="size-4" aria-hidden />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <span className="text-sm font-medium md:hidden">Score Ponto</span>
          <span className="hidden text-sm text-muted-foreground md:block">Painel administrativo</span>
          <Button variant="outline" size="sm" className="md:hidden" onClick={sair}>
            Sair
          </Button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
