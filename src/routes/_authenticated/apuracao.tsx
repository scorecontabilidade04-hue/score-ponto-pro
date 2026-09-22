import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas } from "@/lib/empresas";
import { dataBr } from "@/lib/br";
import {
  calcularDia,
  formatarMinutos,
  somarResultados,
  type JornadaCalculo,
  type MarcacoesDia,
  type TipoRegistro,
} from "@/lib/calculo";
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

export const Route = createFileRoute("/_authenticated/apuracao")({
  head: () => ({
    meta: [
      { title: "Apuração de Jornada — Score Ponto" },
      {
        name: "description",
        content: "Horas trabalhadas, previsto x realizado, atrasos, excedentes e saldo do período.",
      },
      { property: "og:title", content: "Apuração de Jornada — Score Ponto" },
      {
        property: "og:description",
        content: "Compare a jornada prevista com a realizada e acompanhe o saldo de horas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApuracaoPage,
});

function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ApuracaoPage() {
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

  const { data: vinculos = [] } = useQuery({
    queryKey: ["vinculos-jornada-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionario_jornadas")
        .select(
          "funcionario_id, jornadas(carga_diaria_minutos, hora_entrada, hora_saida, intervalo_inicio, intervalo_fim, dias_trabalhados)",
        )
        .is("fim_em", null);
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
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        empresa_id: string;
        funcionario_id: string;
        data: string;
        tipo: TipoRegistro;
        hora: string;
      }[];
    },
  });

  const jornadaDe = useMemo(() => {
    const m = new Map<string, JornadaCalculo>();
    for (const v of vinculos as { funcionario_id: string; jornadas: JornadaCalculo | null }[]) {
      if (v.jornadas) m.set(v.funcionario_id, v.jornadas);
    }
    return m;
  }, [vinculos]);

  const linhas = useMemo(() => {
    const filtrados = registros.filter(
      (r) =>
        (empresa === "todas" || r.empresa_id === empresa) &&
        (funcionario === "todos" || r.funcionario_id === funcionario),
    );
    const mapa = new Map<
      string,
      { data: string; funcionario_id: string; empresa_id: string; marcacoes: MarcacoesDia }
    >();
    for (const r of filtrados) {
      const chave = `${r.data}|${r.funcionario_id}`;
      const atual =
        mapa.get(chave) ??
        {
          data: r.data,
          funcionario_id: r.funcionario_id,
          empresa_id: r.empresa_id,
          marcacoes: {} as MarcacoesDia,
        };
      atual.marcacoes[r.tipo] = new Date(r.hora);
      mapa.set(chave, atual);
    }
    return Array.from(mapa.values())
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .map((l) => ({
        ...l,
        resultado: calcularDia(l.data, l.marcacoes, jornadaDe.get(l.funcionario_id)),
      }));
  }, [registros, empresa, funcionario, jornadaDe]);

  const totais = useMemo(() => somarResultados(linhas.map((l) => l.resultado)), [linhas]);

  const nomeFunc = (id: string) => funcionarios.find((f) => f.id === id)?.nome ?? "—";

  const funcionariosFiltrados =
    empresa === "todas" ? funcionarios : funcionarios.filter((f) => f.empresa_id === empresa);

  const cards = [
    { titulo: "Horas trabalhadas", valor: formatarMinutos(totais.trabalhadoMinutos) },
    { titulo: "Jornada prevista", valor: formatarMinutos(totais.previstoMinutos) },
    { titulo: "Atrasos", valor: formatarMinutos(totais.atrasoMinutos) },
    { titulo: "Saídas antecipadas", valor: formatarMinutos(totais.saidaAntecipadaMinutos) },
    { titulo: "Horas excedentes", valor: formatarMinutos(totais.excedenteMinutos) },
    { titulo: "Saldo do período", valor: formatarMinutos(totais.saldoMinutos) },
  ];

  function exportarCsv() {
    const cabecalho = [
      "Data",
      "Funcionario",
      "Trabalhado",
      "Previsto",
      "Intervalo",
      "Atraso",
      "Saida antecipada",
      "Saldo",
      "Situacao",
    ];
    const corpo = linhas.map((l) => [
      dataBr(l.data),
      nomeFunc(l.funcionario_id),
      formatarMinutos(l.resultado.trabalhadoMinutos),
      formatarMinutos(l.resultado.previstoMinutos),
      formatarMinutos(l.resultado.intervaloMinutos),
      formatarMinutos(l.resultado.atrasoMinutos),
      formatarMinutos(l.resultado.saidaAntecipadaMinutos),
      formatarMinutos(l.resultado.saldoMinutos),
      l.resultado.completo ? "Completo" : "Incompleto",
    ]);
    const csv = [cabecalho, ...corpo]
      .map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `apuracao-${de}-a-${ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apuração de Jornada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Previsto x realizado, atrasos, excedentes e saldo de horas do período.
          </p>
        </div>
        <Button variant="outline" onClick={exportarCsv} disabled={linhas.length === 0}>
          <Download className="size-4" aria-hidden />
          Exportar CSV
        </Button>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.titulo} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.titulo}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Trabalhado</TableHead>
              <TableHead>Previsto</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Atraso</TableHead>
              <TableHead>Saída antec.</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro no período.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l) => (
                <TableRow key={`${l.data}-${l.funcionario_id}`}>
                  <TableCell>{dataBr(l.data)}</TableCell>
                  <TableCell className="font-medium">{nomeFunc(l.funcionario_id)}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.trabalhadoMinutos)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.previstoMinutos)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.intervaloMinutos)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.atrasoMinutos)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.saidaAntecipadaMinutos)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatarMinutos(l.resultado.saldoMinutos)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.resultado.completo ? "secondary" : "outline"}>
                      {l.resultado.completo ? "Completo" : "Incompleto"}
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
