import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn, LogOut, Coffee, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/meu-ponto")({
  head: () => ({
    meta: [
      { title: "Meu Ponto — Score Ponto" },
      { name: "description", content: "Registre entrada, intervalo, retorno e saída da sua jornada." },
      { property: "og:title", content: "Meu Ponto — Score Ponto" },
      { property: "og:description", content: "Registro eletrônico de jornada do colaborador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeuPontoPage,
});

type Tipo = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida";

const rotulos: Record<Tipo, string> = {
  entrada: "Entrada",
  saida_intervalo: "Saída para intervalo",
  retorno_intervalo: "Retorno do intervalo",
  saida: "Saída",
};

function dataLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hora(v: string) {
  return new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function proximoPermitido(tipos: Tipo[]): Tipo | null {
  const tem = (t: Tipo) => tipos.includes(t);
  if (!tem("entrada")) return "entrada";
  if (!tem("saida_intervalo")) return "saida_intervalo";
  if (!tem("retorno_intervalo")) return "retorno_intervalo";
  if (!tem("saida")) return "saida";
  return null;
}

function MeuPontoPage() {
  const qc = useQueryClient();
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: vinculo, isLoading: carregandoVinculo } = useQuery({
    queryKey: ["meu-funcionario"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, empresa_id, ativo, jornada_id, empresas(nome, razao_social)")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, uid } : null;
    },
  });

  const hoje = dataLocal();

  const { data: registros = [] } = useQuery({
    queryKey: ["meus-registros", vinculo?.id, hoje],
    enabled: !!vinculo?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_ponto")
        .select("id, tipo, hora")
        .eq("funcionario_id", vinculo!.id)
        .eq("data", hoje)
        .order("hora", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; tipo: Tipo; hora: string }[];
    },
  });

  const tiposFeitos = registros.map((r) => r.tipo);
  const proximo = proximoPermitido(tiposFeitos);

  const registrar = useMutation({
    mutationFn: async (tipo: Tipo) => {
      if (!vinculo) throw new Error("Você ainda não está vinculado a um cadastro de funcionário.");
      if (!vinculo.ativo) throw new Error("Cadastro inativo: fale com o administrador.");
      if (tiposFeitos.includes(tipo)) throw new Error(`${rotulos[tipo]} já registrada hoje.`);
      if (proximo !== tipo) {
        throw new Error(
          proximo
            ? `Registro fora de ordem. O próximo registro esperado é: ${rotulos[proximo]}.`
            : "Todos os registros de hoje já foram feitos.",
        );
      }
      const { error } = await supabase.from("registros_ponto").insert({
        empresa_id: vinculo.empresa_id,
        funcionario_id: vinculo.id,
        data: hoje,
        tipo,
        usuario_id: vinculo.uid,
        dispositivo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
      });
      if (error) throw error;
      return tipo;
    },
    onSuccess: (tipo) => {
      toast.success(`${rotulos[tipo]} registrada às ${new Date().toLocaleTimeString("pt-BR")}`);
      qc.invalidateQueries({ queryKey: ["meus-registros"] });
      qc.invalidateQueries({ queryKey: ["registros-ponto"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const botoes: { tipo: Tipo; icone: typeof LogIn }[] = [
    { tipo: "entrada", icone: LogIn },
    { tipo: "saida_intervalo", icone: Coffee },
    { tipo: "retorno_intervalo", icone: Undo2 },
    { tipo: "saida", icone: LogOut },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu Ponto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {carregandoVinculo
            ? "Carregando..."
            : vinculo
              ? `${vinculo.nome} · ${agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`
              : "Sem cadastro de funcionário vinculado ao seu usuário."}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Horário atual</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">
          {agora.toLocaleTimeString("pt-BR")}
        </p>

        {!carregandoVinculo && !vinculo && (
          <p className="mt-4 rounded-md border border-border bg-accent/40 p-3 text-sm">
            Peça ao administrador para vincular seu usuário a um cadastro de funcionário em
            Funcionários.
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {botoes.map(({ tipo, icone: Icone }) => {
            const feito = tiposFeitos.includes(tipo);
            return (
              <Button
                key={tipo}
                variant={proximo === tipo ? "default" : "outline"}
                className="h-auto justify-start gap-3 py-4"
                disabled={!vinculo || feito || proximo !== tipo || registrar.isPending}
                onClick={() => registrar.mutate(tipo)}
              >
                <Icone className="size-4" aria-hidden />
                <span className="text-left">
                  <span className="block text-sm font-medium">{rotulos[tipo]}</span>
                  <span className="block text-xs opacity-70">
                    {feito
                      ? `Registrado às ${hora(registros.find((r) => r.tipo === tipo)!.hora)}`
                      : proximo === tipo
                        ? "Disponível agora"
                        : "Indisponível"}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">Registros de hoje</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro hoje.
                </TableCell>
              </TableRow>
            ) : (
              registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{rotulos[r.tipo]}</TableCell>
                  <TableCell className="font-mono tabular-nums">{hora(r.hora)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Registrado</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Registros não podem ser editados ou excluídos pelo funcionário. Correções são feitas pelo
        administrador, com histórico de ajuste.
      </p>
    </div>
  );
}
