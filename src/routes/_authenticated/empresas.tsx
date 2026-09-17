import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas, usuarioAtual, type Empresa } from "@/lib/empresas";
import { cnpjValido, dataBr, formatarCnpj, soNumeros } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Score Ponto" },
      { name: "description", content: "Cadastro e gestão das empresas do grupo no Score Ponto." },
      { property: "og:title", content: "Empresas — Score Ponto" },
      { property: "og:description", content: "Cadastro e gestão das empresas do grupo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmpresasPage,
});

const vazio = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  ativo: true,
};

function EmpresasPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<Empresa | null>(null);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: listarEmpresas,
  });

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return empresas;
    return empresas.filter((e) =>
      [e.razao_social, e.nome_fantasia, e.cnpj].some((v) => (v ?? "").toLowerCase().includes(t)),
    );
  }, [empresas, busca]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.razao_social.trim()) throw new Error("Informe a razão social.");
      if (!form.cnpj.trim()) throw new Error("O CNPJ é obrigatório.");
      if (!cnpjValido(form.cnpj)) throw new Error("CNPJ inválido.");

      const cnpj = soNumeros(form.cnpj);
      const duplicado = empresas.find((e) => e.cnpj === cnpj && e.id !== editando?.id);
      if (duplicado) throw new Error("Já existe uma empresa com este CNPJ.");

      const payload = {
        nome: form.razao_social.trim(),
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia.trim() || null,
        cnpj,
        endereco: form.endereco.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        ativo: form.ativo,
      };

      if (editando) {
        const { error } = await supabase.from("empresas").update(payload).eq("id", editando.id);
        if (error) throw error;
        return;
      }

      const user = await usuarioAtual();
      const { data, error } = await supabase
        .from("empresas")
        .insert({ ...payload, criado_por: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;

      if (user) {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("empresa_id")
          .eq("id", user.id)
          .maybeSingle();
        if (perfil && !perfil.empresa_id) {
          await supabase.from("profiles").update({ empresa_id: data.id }).eq("id", user.id);
        }
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Empresa atualizada." : "Empresa cadastrada.");
      setAberto(false);
      setEditando(null);
      setForm(vazio);
      qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarStatus = useMutation({
    mutationFn: async (e: Empresa) => {
      const { error } = await supabase
        .from("empresas")
        .update({ ativo: !e.ativo })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNova() {
    setEditando(null);
    setForm(vazio);
    setAberto(true);
  }

  function abrirEdicao(e: Empresa) {
    setEditando(e);
    setForm({
      razao_social: e.razao_social ?? e.nome,
      nome_fantasia: e.nome_fantasia ?? "",
      cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "",
      endereco: e.endereco ?? "",
      telefone: e.telefone ?? "",
      email: e.email ?? "",
      ativo: e.ativo,
    });
    setAberto(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro das empresas atendidas pelo sistema.
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus className="size-4" aria-hidden /> Nova empresa
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Buscar por razão social, fantasia ou CNPJ"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razão social</TableHead>
              <TableHead>Nome fantasia</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  Nenhuma empresa encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.razao_social ?? e.nome}</TableCell>
                <TableCell>{e.nome_fantasia ?? "—"}</TableCell>
                <TableCell>{e.cnpj ? formatarCnpj(e.cnpj) : "—"}</TableCell>
                <TableCell>{dataBr(e.created_at)}</TableCell>
                <TableCell>
                  <Badge variant={e.ativo ? "secondary" : "outline"}>
                    {e.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetalhe(e)}>
                      <Eye className="size-4" aria-hidden />
                      <span className="sr-only">Detalhes</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(e)}>
                      <Pencil className="size-4" aria-hidden />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alternarStatus.mutate(e)}>
                      {e.ativo ? "Inativar" : "Ativar"}
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
            <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              salvar.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="razao">Razão social *</Label>
              <Input
                id="razao"
                required
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fantasia">Nome fantasia</Label>
              <Input
                id="fantasia"
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                required
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatarCnpj(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone</Label>
              <Input
                id="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mail">E-mail</Label>
              <Input
                id="mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label htmlFor="ativo">Empresa ativa</Label>
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
            <DialogTitle>{detalhe?.razao_social ?? detalhe?.nome}</DialogTitle>
          </DialogHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Nome fantasia", detalhe?.nome_fantasia],
              ["CNPJ", detalhe?.cnpj ? formatarCnpj(detalhe.cnpj) : null],
              ["Endereço", detalhe?.endereco],
              ["Telefone", detalhe?.telefone],
              ["E-mail", detalhe?.email],
              ["Cadastro", detalhe ? dataBr(detalhe.created_at) : null],
              ["Status", detalhe?.ativo ? "Ativa" : "Inativa"],
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
