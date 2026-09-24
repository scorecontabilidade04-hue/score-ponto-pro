import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { dataBr } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes de Ponto — Score Ponto" },
      { name: "description", content: "Solicite e aprove ajustes de marcações de ponto com histórico." },
      { property: "og:title", content: "Ajustes de Ponto — Score Ponto" },
      { property: "og:description", content: "Fluxo de solicitação e aprovação de ajustes de ponto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AjustesPage,
});

type Tipo = "entrada" | "saida_intervalo" | "retorno_intervalo" | "saida";
const TIPOS: Record<Tipo, string> = {
  entrada: "Entrada",
  saida_intervalo: "Saída intervalo",
  retorno_intervalo: "Retorno intervalo",
  saida: "Saída",
};
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function AjustesPage() {
  const qc = useQueryClient();
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const { data: ctx } = useQuery({
    queryKey: ["ajustes-ctx"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "";
      const [{ data: roles }, { data: func }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("funcionarios").select("id, empresa_id").eq("user_id", uid).maybeSingle(),
      ]);
      return { uid, admin: !!roles?.some((r) => r.role === "admin"), func };
    },
  });

  const { data: lista = [] } = useQuery({
    queryKey: ["solicitacoes-ajuste"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_ajuste")
        .select("*, funcionarios(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const solicitar = useMutation({
    mutationFn: async () => {
      if (!ctx?.func) throw new Error("Seu usuário não está vinculado a um funcionário.");
      if (!data || !hora || motivo.trim().length < 5)
        throw new Error("Informe data, hora e um motivo (mín. 5 caracteres).");
      const { data: existente } = await supabase
        .from("registros_ponto")
        .select("id")
        .eq("funcionario_id", ctx.func.id)
        .eq("data", data)
        .eq("tipo", tipo)
        .maybeSingle();
      const { error } = await supabase.from("solicitacoes_ajuste").insert({
        empresa_id: ctx.func.empresa_id,
        funcionario_id: ctx.func.id,
        registro_id: existente?.id ?? null,
        data,
        tipo,
        hora_solicitada: new Date(`${data}T${hora}:00`).toISOString(),
        motivo: motivo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada para aprovação.");
      setMotivo("");
      setHora("");
      qc.invalidateQueries({ queryKey: ["solicitacoes-ajuste"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analisar = useMutation({
    mutationFn: async ({ s, aprovar }: { s: (typeof lista)[number]; aprovar: boolean }) => {
      if (aprovar) {
        let registroId = s.registro_id;
        let anterior: string | null = null;
        if (registroId) {
          const { data: r } = await supabase
            .from("registros_ponto").select("hora").eq("id", registroId).single();
          anterior = r?.hora ?? null;
          const { error } = await supabase
            .from("registros_ponto").update({ hora: s.hora_solicitada }).eq("id", registroId);
          if (error) throw error;
        } else {
          const { data: novo, error } = await supabase
            .from("registros_ponto")
            .insert({
              empresa_id: s.empresa_id,
              funcionario_id: s.funcionario_id,
              data: s.data,
              tipo: s.tipo,
              hora: s.hora_solicitada,
              usuario_id: ctx?.uid,
              dispositivo: "ajuste aprovado",
            })
            .select("id")
            .single();
          if (error) throw error;
          registroId = novo.id;
        }
        const { error: eAj } = await supabase.from("ajustes_ponto").insert({
          empresa_id: s.empresa_id,
          registro_id: registroId!,
          valor_anterior: anterior,
          valor_novo: s.hora_solicitada,
          motivo: s.motivo,
          responsavel_id: ctx?.uid,
        });
        if (eAj) throw eAj;
      }
      const { error } = await supabase
        .from("solicitacoes_ajuste")
        .update({
          status: aprovar ? "aprovado" : "rejeitado",
          analisado_por: ctx?.uid,
          analisado_em: new Date().toISOString(),
        })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.aprovar ? "Ajuste aprovado e aplicado." : "Solicitação rejeitada.");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes de Ponto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O funcionário solicita a correção; o administrador aprova ou rejeita. Tudo fica no histórico.
        </p>
      </div>

      {ctx?.func && (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="d">Data</Label>
            <Input id="d" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Marcação</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h">Hora correta</Label>
            <Input id="h" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="m">Motivo</Label>
            <Textarea id="m" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <div>
            <Button onClick={() => solicitar.mutate()} disabled={solicitar.isPending}>
              Solicitar ajuste
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Marcação</TableHead>
              <TableHead>Hora pedida</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Status</TableHead>
              {ctx?.admin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma solicitação.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.funcionarios?.nome ?? "—"}</TableCell>
                  <TableCell>{dataBr(s.data)}</TableCell>
                  <TableCell>{TIPOS[s.tipo as Tipo]}{s.registro_id ? "" : " (nova)"}</TableCell>
                  <TableCell className="font-mono tabular-nums">{hhmm(s.hora_solicitada)}</TableCell>
                  <TableCell className="max-w-xs truncate">{s.motivo}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "pendente" ? "outline" : "secondary"}>
                      {s.status === "pendente" ? "Pendente" : s.status === "aprovado" ? "Aprovado" : "Rejeitado"}
                    </Badge>
                  </TableCell>
                  {ctx?.admin && (
                    <TableCell className="space-x-2 text-right">
                      {s.status === "pendente" && (
                        <>
                          <Button size="sm" disabled={analisar.isPending}
                            onClick={() => analisar.mutate({ s, aprovar: true })}>Aprovar</Button>
                          <Button size="sm" variant="outline" disabled={analisar.isPending}
                            onClick={() => analisar.mutate({ s, aprovar: false })}>Rejeitar</Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
