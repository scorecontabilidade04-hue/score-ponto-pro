import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dataBr } from "@/lib/br";
import { calcularDia, formatarMinutos, somarResultados, type JornadaCalculo, type MarcacoesDia, type TipoRegistro } from "@/lib/calculo";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Score Ponto" },
      { name: "description", content: "Indicadores de jornada, presenças do dia e saldo de horas do mês." },
      { property: "og:title", content: "Dashboard — Score Ponto" },
      { property: "og:description", content: "Indicadores de jornada, presenças do dia e saldo de horas do mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function Dashboard() {
  const hoje = hojeIso();
  const de = inicioMes();

  const { data: perfilInfo, isLoading: carregandoPerfil } = useQuery({
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

  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["dashboard-indicadores", de, hoje],
    queryFn: async () => {
      const [funcs, jorn, regsMes, vinc] = await Promise.all([
        supabase.from("funcionarios").select("id, nome, ativo"),
        supabase.from("jornadas").select("id, ativo"),
        supabase
          .from("registros_ponto")
          .select("funcionario_id, data, tipo, hora")
          .gte("data", de)
          .lte("data", hoje),
        supabase
          .from("funcionario_jornadas")
          .select(
            "funcionario_id, jornadas(carga_diaria_minutos, hora_entrada, hora_saida, intervalo_inicio, intervalo_fim, dias_trabalhados)",
          )
          .is("fim_em", null),
      ]);
      if (funcs.error) throw funcs.error;
      if (jorn.error) throw jorn.error;
      if (regsMes.error) throw regsMes.error;
      if (vinc.error) throw vinc.error;

      const funcionarios = funcs.data ?? [];
      const registros = (regsMes.data ?? []) as {
        funcionario_id: string;
        data: string;
        tipo: TipoRegistro;
        hora: string;
      }[];

      const jornadaDe = new Map<string, JornadaCalculo>();
      for (const v of (vinc.data ?? []) as { funcionario_id: string; jornadas: JornadaCalculo | null }[]) {
        if (v.jornadas) jornadaDe.set(v.funcionario_id, v.jornadas);
      }

      const mapa = new Map<string, { data: string; funcionario_id: string; marcacoes: MarcacoesDia }>();
      for (const r of registros) {
        const chave = `${r.data}|${r.funcionario_id}`;
        const atual =
          mapa.get(chave) ?? { data: r.data, funcionario_id: r.funcionario_id, marcacoes: {} as MarcacoesDia };
        atual.marcacoes[r.tipo] = new Date(r.hora);
        mapa.set(chave, atual);
      }
      const dias = Array.from(mapa.values()).map((d) => ({
        ...d,
        resultado: calcularDia(d.data, d.marcacoes, jornadaDe.get(d.funcionario_id)),
      }));

      const totaisMes = somarResultados(dias.map((d) => d.resultado));
      const doDia = dias.filter((d) => d.data === hoje);

      const nomeDe = new Map(funcionarios.map((f) => [f.id, f.nome]));
      const presencas = doDia
        .map((d) => ({
          funcionario: nomeDe.get(d.funcionario_id) ?? "—",
          entrada: d.marcacoes.entrada ?? null,
          saida: d.marcacoes.saida ?? null,
          atraso: d.resultado.atrasoMinutos,
          completo: d.resultado.completo,
        }))
        .sort((a, b) => a.funcionario.localeCompare(b.funcionario));

      return {
        funcionariosAtivos: funcionarios.filter((f) => f.ativo).length,
        jornadasAtivas: (jorn.data ?? []).filter((j) => j.ativo).length,
        presentesHoje: doDia.length,
        atrasosHoje: doDia.filter((d) => d.resultado.atrasoMinutos > 0).length,
        saldoMes: totaisMes.saldoMinutos,
        trabalhadoMes: totaisMes.trabalhadoMinutos,
        presencas,
      };
    },
  });

  const cards = [
    { titulo: "Funcionários ativos", valor: indicadores ? String(indicadores.funcionariosAtivos) : "—" },
    { titulo: "Jornadas ativas", valor: indicadores ? String(indicadores.jornadasAtivas) : "—" },
    { titulo: "Registraram hoje", valor: indicadores ? String(indicadores.presentesHoje) : "—" },
    { titulo: "Atrasos hoje", valor: indicadores ? String(indicadores.atrasosHoje) : "—" },
    { titulo: "Horas no mês", valor: indicadores ? formatarMinutos(indicadores.trabalhadoMes) : "—" },
    { titulo: "Saldo do mês", valor: indicadores ? formatarMinutos(indicadores.saldoMes) : "—" },
  ];

  const hora = (d: Date | null) =>
    d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {carregandoPerfil
            ? "Carregando perfil..."
            : `${perfilInfo?.perfil?.nome || perfilInfo?.perfil?.email || "Usuário"} · perfil: ${
                perfilInfo?.papeis.map((p) => p.role).join(", ") || "sem perfil"
              } · ${dataBr(hoje)}`}
        </p>
      </div>

      {!carregandoPerfil && !perfilInfo?.perfil?.empresa_id && (
        <div className="rounded-lg border border-border bg-accent/40 p-4 text-sm">
          Nenhuma empresa vinculada ao seu usuário ainda. Cadastre uma em{" "}
          <Link to="/empresas" className="underline">
            Empresas
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.titulo} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.titulo}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">Presenças de hoje</h2>
          <Link to="/apuracao" className="text-sm text-muted-foreground underline">
            Ver apuração
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Atraso</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : !indicadores || indicadores.presencas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma marcação registrada hoje.
                </TableCell>
              </TableRow>
            ) : (
              indicadores.presencas.map((p) => (
                <TableRow key={p.funcionario}>
                  <TableCell className="font-medium">{p.funcionario}</TableCell>
                  <TableCell className="font-mono tabular-nums">{hora(p.entrada)}</TableCell>
                  <TableCell className="font-mono tabular-nums">{hora(p.saida)}</TableCell>
                  <TableCell className="font-mono tabular-nums">{formatarMinutos(p.atraso)}</TableCell>
                  <TableCell>
                    <Badge variant={p.completo ? "secondary" : "outline"}>
                      {p.completo ? "Completo" : "Em andamento"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
