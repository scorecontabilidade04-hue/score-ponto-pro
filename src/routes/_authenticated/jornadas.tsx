import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas } from "@/lib/empresas";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/jornadas")({
  head: () => ({
    meta: [
      { title: "Jornadas — Score Ponto" },
      { name: "description", content: "Modelos de jornada: fixa, 5x2, 6x1, 12x36 e estágio." },
      { property: "og:title", content: "Jornadas — Score Ponto" },
      { property: "og:description", content: "Modelos de jornada e escalas de trabalho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JornadasPage,
});

const tipos = [
  { v: "fixa", l: "Jornada fixa" },
  { v: "5x2", l: "5x2" },
  { v: "6x1", l: "6x1" },
  { v: "12x36", l: "12x36" },
  { v: "semana_espanhola", l: "Semana espanhola" },
  { v: "estagio", l: "Estágio" },
] as const;

type TipoJornada = (typeof tipos)[number]["v"];

type Jornada = {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: TipoJornada;
  carga_diaria_minutos: number;
  carga_semanal_minutos: number;
  hora_entrada: string | null;
  hora_saida: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  dias_trabalhados: string | null;
  dias_descanso: string | null;
  ativo: boolean;
};

const vazio = {
  empresa_id: "",
  nome: "",
  tipo: "fixa" as TipoJornada,
  carga_diaria: "08:00",
  carga_semanal: "44:00",
  hora_entrada: "08:00",
  hora_saida: "17:00",
  intervalo_inicio: "12:00",
  intervalo_fim: "13:00",
  dias_trabalhados: "Segunda a sexta",
  dias_descanso: "Sábado e domingo",
};

function paraMinutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function paraHoras(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function hhmm(v: string | null) {
  return v ? v.slice(0, 5) : "—";
}

function JornadasPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Jornada | null>(null);
  const [detalhe, setDetalhe] = useState<Jornada | null>(null);
  const [form, setForm] = useState(vazio);

  const { data: empresas = [] } = useQuery({ queryKey: ["empresas"], queryFn: listarEmpresas });

  const { data: jornadas = [], isLoading } = useQuery({
    queryKey: ["jornadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jornadas")
        .select(
          "id, empresa_id, nome, tipo, carga_diaria_minutos, carga_semanal_minutos, hora_entrada, hora_saida, intervalo_inicio, intervalo_fim, dias_trabalhados, dias_descanso, ativo",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Jornada[];
    },
  });

  const nomeEmpresa = (id: string) => {
    const e = empresas.find((x) => x.id === id);
    return e?.nome_fantasia || e?.razao_social || e?.nome || "—";
  };

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return jornadas;
    return jornadas.filter((j) => j.nome.toLowerCase().includes(t));
  }, [jornadas, busca]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.empresa_id) throw new Error("Selecione a empresa.");
      if (!form.nome.trim()) throw new Error("Informe o nome da jornada.");
      const payload = {
        empresa_id: form.empresa_id,
        nome: form.nome.trim(),
        tipo: form.tipo,
        carga_diaria_minutos: paraMinutos(form.carga_diaria),
        carga_semanal_minutos: paraMinutos(form.carga_semanal),
        hora_entrada: form.hora_entrada || null,
        hora_saida: form.hora_saida || null,
        intervalo_inicio: form.intervalo_inicio || null,
        intervalo_fim: form.intervalo_fim || null,
        dias_trabalhados: form.dias_trabalhados.trim() || null,
        dias_descanso: form.dias_descanso.trim() || null,
      };
      if (editando) {
        const { error } = await supabase.from("jornadas").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jornadas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Jornada atualizada." : "Jornada criada.");
      setAberto(false);
      setEditando(null);
      setForm(vazio);
      qc.invalidateQueries({ queryKey: ["jornadas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarStatus = useMutation({
    mutationFn: async (j: Jornada) => {
      const { error } = await supabase.from("jornadas").update({ ativo: !j.ativo }).eq("id", j.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jornadas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNova() {
    setEditando(null);
    setForm({ ...vazio, empresa_id: empresas[0]?.id ?? "" });
    setAberto(true);
  }

  function abrirEdicao(j: Jornada) {
    setEditando(j);
    setForm({
      empresa_id: j.empresa_id,
      nome: j.nome,
      tipo: j.tipo,
      carga_diaria: paraHoras(j.carga_diaria_minutos),
      carga_semanal: paraHoras(j.carga_semanal_minutos),
      hora_entrada: j.hora_entrada?.slice(0, 5) ?? "",
      hora_saida: j.hora_saida?.slice(0, 5) ?? "",
      intervalo_inicio: j.intervalo_inicio?.slice(0, 5) ?? "",
      intervalo_fim: j.intervalo_fim?.slice(0, 5) ?? "",
      dias_trabalhados: j.dias_trabalhados ?? "",
      dias_descanso: j.dias_descanso ?? "",
    });
    setAberto(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jornadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modelos de jornada aplicáveis aos funcionários.
          </p>
        </div>
        <Button onClick={abrirNova} disabled={empresas.length === 0}>
          <Plus className="size-4" aria-hidden /> Nova jornada
        </Button>
      </div>

      {empresas.length === 0 && (
        <div className="rounded-lg border border-border bg-accent/40 p-4 text-sm">
          Cadastre uma empresa antes de criar jornadas.
        </div>
      )}

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Buscar jornada"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Diária</TableHead>
              <TableHead>Semanal</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  Nenhuma jornada cadastrada.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.nome}</TableCell>
                <TableCell>{nomeEmpresa(j.empresa_id)}</TableCell>
                <TableCell>{tipos.find((t) => t.v === j.tipo)?.l ?? j.tipo}</TableCell>
                <TableCell>{paraHoras(j.carga_diaria_minutos)}</TableCell>
                <TableCell>{paraHoras(j.carga_semanal_minutos)}</TableCell>
                <TableCell>
                  {hhmm(j.hora_entrada)} – {hhmm(j.hora_saida)}
                </TableCell>
                <TableCell>
                  <Badge variant={j.ativo ? "secondary" : "outline"}>
                    {j.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetalhe(j)}>
                      <Eye className="size-4" aria-hidden />
                      <span className="sr-only">Detalhes</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(j)}>
                      <Pencil className="size-4" aria-hidden />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alternarStatus.mutate(j)}>
                      {j.ativo ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar jornada" : "Nova jornada"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              salvar.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={form.empresa_id}
                onValueChange={(v) => setForm({ ...form, empresa_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social || e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jnome">Nome da jornada *</Label>
              <Input
                id="jnome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as TipoJornada })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.v} value={t.v}>
                      {t.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cd">Carga diária</Label>
                <Input
                  id="cd"
                  type="time"
                  value={form.carga_diaria}
                  onChange={(e) => setForm({ ...form, carga_diaria: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cs">Carga semanal</Label>
                <Input
                  id="cs"
                  type="time"
                  value={form.carga_semanal}
                  onChange={(e) => setForm({ ...form, carga_semanal: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="he">Entrada</Label>
              <Input
                id="he"
                type="time"
                value={form.hora_entrada}
                onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs">Saída</Label>
              <Input
                id="hs"
                type="time"
                value={form.hora_saida}
                onChange={(e) => setForm({ ...form, hora_saida: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ii">Intervalo início</Label>
              <Input
                id="ii"
                type="time"
                value={form.intervalo_inicio}
                onChange={(e) => setForm({ ...form, intervalo_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="if">Intervalo fim</Label>
              <Input
                id="if"
                type="time"
                value={form.intervalo_fim}
                onChange={(e) => setForm({ ...form, intervalo_fim: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt">Dias trabalhados</Label>
              <Input
                id="dt"
                value={form.dias_trabalhados}
                onChange={(e) => setForm({ ...form, dias_trabalhados: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd">Dias de descanso</Label>
              <Input
                id="dd"
                value={form.dias_descanso}
                onChange={(e) => setForm({ ...form, dias_descanso: e.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detalhe?.nome}</DialogTitle>
          </DialogHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Empresa", detalhe ? nomeEmpresa(detalhe.empresa_id) : null],
              ["Tipo", tipos.find((t) => t.v === detalhe?.tipo)?.l],
              ["Carga diária", detalhe ? paraHoras(detalhe.carga_diaria_minutos) : null],
              ["Carga semanal", detalhe ? paraHoras(detalhe.carga_semanal_minutos) : null],
              ["Entrada", hhmm(detalhe?.hora_entrada ?? null)],
              ["Saída", hhmm(detalhe?.hora_saida ?? null)],
              [
                "Intervalo",
                `${hhmm(detalhe?.intervalo_inicio ?? null)} – ${hhmm(detalhe?.intervalo_fim ?? null)}`,
              ],
              ["Dias trabalhados", detalhe?.dias_trabalhados],
              ["Dias de descanso", detalhe?.dias_descanso],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5">{(v as string) || "—"}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
