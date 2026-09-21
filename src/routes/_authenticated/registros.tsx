import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas } from "@/lib/empresas";
import { dataBr } from "@/lib/br";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/registros")({
  head: () => ({
    meta: [
      { title: "Registros de Ponto — Score Ponto" },
      { name: "description", content: "Consulta das marcações de ponto por empresa, funcionário e período." },
      { property: "og:title", content: "Registros de Ponto — Score Ponto" },
      { property: "og:description", content: "Acompanhe entradas, intervalos e saídas da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistrosPage,
});

type Tipo = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida";

function hora(v: string) {
  return new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RegistrosPage() {
  const [empresa, setEmpresa] = useState("todas");
  const [funcionario, setFuncionario] = useState("todos");
  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(hojeIso);

  const { data: empresas = [] } = useQuery({ queryKey: ["empresas"], queryFn: listarEmpresas });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios-simples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, empresa_id")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["registros-ponto", de, ate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("id, empresa_id, funcionario_id, data, tipo, hora")
        .gte("data", de)
        .lte("data", ate)
        .order("data", { ascending: false })
        .order("hora", { ascending: true });
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        empresa_id: string;
        funcionario_id: string;
        data: string;
        tipo: Tipo;
        hora: string;
      }[];
    },
  });

  const linhas = useMemo(() => {
    const filtrados = registros.filter(
      (r) =>
        (empresa === "todas" || r.empresa_id === empresa) &&
        (funcionario === "todos" || r.funcionario_id === funcionario),
    );
    const mapa = new Map<
      string,
      { data: string; funcionario_id: string; empresa_id: string } & Partial<Record<Tipo, string>>
    >();
    for (const r of filtrados) {
      const chave = `${r.data}|${r.funcionario_id}`;
      const atual =
        mapa.get(chave) ??
        { data: r.data, funcionario_id: r.funcionario_id, empresa_id: r.empresa_id };
      atual[r.tipo] = hora(r.hora);
      mapa.set(chave, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [registros, empresa, funcionario]);

  const nomeFunc = (id: string) => funcionarios.find((f) => f.id === id)?.nome ?? "—";
  const nomeEmp = (id: string) => {
    const e = empresas.find((x) => x.id === id);
    return e?.nome_fantasia || e?.razao_social || e?.nome || "—";
  };

  const funcionariosFiltrados =
    empresa === "todas" ? funcionarios : funcionarios.filter((f) => f.empresa_id === empresa);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registros de Ponto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marcações por empresa, funcionário e período.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select
            value={empresa}
            onValueChange={(v) => {
              setEmpresa(v);
              setFuncionario("todos");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia || e.razao_social || e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Funcionário</Label>
          <Select value={funcionario} onValueChange={setFuncionario}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {funcionariosFiltrados.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="de">De</Label>
          <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ate">Até</Label>
          <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Retorno</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro no período.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => {
                const completo = !!l.entrada && !!l.saida;
                return (
                  <TableRow key={`${l.data}-${l.funcionario_id}`}>
                    <TableCell>{dataBr(l.data)}</TableCell>
                    <TableCell className="font-medium">{nomeFunc(l.funcionario_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{nomeEmp(l.empresa_id)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{l.entrada ?? "—"}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {l.saida_intervalo ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {l.retorno_intervalo ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{l.saida ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={completo ? "secondary" : "outline"}>
                        {completo ? "Completo" : "Incompleto"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
