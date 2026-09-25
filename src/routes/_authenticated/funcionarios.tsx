import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas } from "@/lib/empresas";
import { AcessoDialog, ROTULO_ACESSO } from "@/components/AcessoDialog";
import { cpfValido, dataBr, formatarCpf, soNumeros } from "@/lib/br";
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

export const Route = createFileRoute("/_authenticated/funcionarios")({
  head: () => ({
    meta: [
      { title: "Funcionários — Score Ponto" },
      {
        name: "description",
        content: "Cadastro de funcionários, dados pessoais, profissionais e jornada vinculada.",
      },
      { property: "og:title", content: "Funcionários — Score Ponto" },
      { property: "og:description", content: "Gestão de funcionários e vínculo de jornada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FuncionariosPage,
});

type Funcionario = {
  id: string;
  empresa_id: string;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  data_admissao: string | null;
  tipo_contrato: "clt" | "estagiario";
  jornada_id: string | null;
  ativo: boolean;
  acesso_email?: string | null;
  acesso_status?: string;
  user_id?: string | null;
};

type JornadaSimples = { id: string; empresa_id: string; nome: string; ativo: boolean };

const vazio = {
  empresa_id: "",
  nome: "",
  cpf: "",
  data_nascimento: "",
  email: "",
  telefone: "",
  cargo: "",
  departamento: "",
  data_admissao: "",
  tipo_contrato: "clt" as "clt" | "estagiario",
  jornada_id: "",
};

const SEM_JORNADA = "__sem__";

function FuncionariosPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [fEmpresa, setFEmpresa] = useState("todas");
  const [fStatus, setFStatus] = useState("todos");
  const [fDepto, setFDepto] = useState("todos");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [detalhe, setDetalhe] = useState<Funcionario | null>(null);
  const [form, setForm] = useState(vazio);
  const [acesso, setAcesso] = useState<Funcionario | null>(null);

  const { data: empresas = [] } = useQuery({ queryKey: ["empresas"], queryFn: listarEmpresas });

  const { data: jornadas = [] } = useQuery({
    queryKey: ["jornadas-simples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jornadas")
        .select("id, empresa_id, nome, ativo")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as JornadaSimples[];
    },
  });

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select(
          "id, empresa_id, nome, cpf, data_nascimento, email, telefone, cargo, departamento, data_admissao, tipo_contrato, jornada_id, ativo, acesso_email, acesso_status, user_id",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Funcionario[];
    },
  });

  const nomeEmpresa = (id: string) => {
    const e = empresas.find((x) => x.id === id);
    return e?.nome_fantasia || e?.razao_social || e?.nome || "—";
  };
  const nomeJornada = (id: string | null) =>
    id ? (jornadas.find((j) => j.id === id)?.nome ?? "—") : "—";

  const departamentos = useMemo(
    () =>
      Array.from(new Set(funcionarios.map((f) => f.departamento).filter(Boolean) as string[])).sort(),
    [funcionarios],
  );

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return funcionarios.filter((f) => {
      if (t && !f.nome.toLowerCase().includes(t) && !soNumeros(f.cpf ?? "").includes(soNumeros(t)))
        return false;
      if (fEmpresa !== "todas" && f.empresa_id !== fEmpresa) return false;
      if (fStatus === "ativos" && !f.ativo) return false;
      if (fStatus === "inativos" && f.ativo) return false;
      if (fDepto !== "todos" && f.departamento !== fDepto) return false;
      return true;
    });
  }, [funcionarios, busca, fEmpresa, fStatus, fDepto]);

  const jornadasDaEmpresa = jornadas.filter(
    (j) => j.empresa_id === form.empresa_id && (j.ativo || j.id === form.jornada_id),
  );

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.empresa_id) throw new Error("Selecione a empresa.");
      if (!form.nome.trim()) throw new Error("Informe o nome completo.");
      const cpf = soNumeros(form.cpf);
      if (!cpf) throw new Error("Informe o CPF.");
      if (!cpfValido(cpf)) throw new Error("CPF inválido.");

      const duplicado = funcionarios.some(
        (f) =>
          f.empresa_id === form.empresa_id &&
          soNumeros(f.cpf ?? "") === cpf &&
          f.id !== editando?.id,
      );
      if (duplicado) throw new Error("Já existe um funcionário com este CPF nesta empresa.");

      const jornadaId = form.jornada_id && form.jornada_id !== SEM_JORNADA ? form.jornada_id : null;
      const payload = {
        empresa_id: form.empresa_id,
        nome: form.nome.trim(),
        cpf,
        data_nascimento: form.data_nascimento || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        cargo: form.cargo.trim() || null,
        departamento: form.departamento.trim() || null,
        data_admissao: form.data_admissao || null,
        tipo_contrato: form.tipo_contrato,
        jornada_id: jornadaId,
      };

      let funcionarioId = editando?.id;
      if (editando) {
        const { error } = await supabase.from("funcionarios").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("funcionarios")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        funcionarioId = data.id;
      }

      // histórico: mantém apenas uma jornada ativa por funcionário
      const jornadaAnterior = editando?.jornada_id ?? null;
      if (funcionarioId && jornadaId !== jornadaAnterior) {
        await supabase
          .from("funcionario_jornadas")
          .update({ fim_em: new Date().toISOString().slice(0, 10) })
          .eq("funcionario_id", funcionarioId)
          .is("fim_em", null);
        if (jornadaId) {
          const { error } = await supabase.from("funcionario_jornadas").insert({
            empresa_id: form.empresa_id,
            funcionario_id: funcionarioId,
            jornada_id: jornadaId,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Funcionário atualizado." : "Funcionário cadastrado.");
      setAberto(false);
      setEditando(null);
      setForm(vazio);
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarStatus = useMutation({
    mutationFn: async (f: Funcionario) => {
      const { error } = await supabase
        .from("funcionarios")
        .update({ ativo: !f.ativo })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funcionarios"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNovo() {
    setEditando(null);
    setForm({ ...vazio, empresa_id: empresas[0]?.id ?? "" });
    setAberto(true);
  }

  function abrirEdicao(f: Funcionario) {
    setEditando(f);
    setForm({
      empresa_id: f.empresa_id,
      nome: f.nome,
      cpf: formatarCpf(f.cpf ?? ""),
      data_nascimento: f.data_nascimento ?? "",
      email: f.email ?? "",
      telefone: f.telefone ?? "",
      cargo: f.cargo ?? "",
      departamento: f.departamento ?? "",
      data_admissao: f.data_admissao ?? "",
      tipo_contrato: f.tipo_contrato,
      jornada_id: f.jornada_id ?? "",
    });
    setAberto(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro, dados profissionais e jornada vinculada.
          </p>
        </div>
        <Button onClick={abrirNovo} disabled={empresas.length === 0}>
          <Plus className="size-4" aria-hidden /> Novo funcionário
        </Button>
      </div>

      {empresas.length === 0 && (
        <div className="rounded-lg border border-border bg-accent/40 p-4 text-sm">
          Cadastre uma empresa antes de incluir funcionários.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou CPF"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={fEmpresa} onValueChange={setFEmpresa}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome_fantasia || e.razao_social || e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fDepto} onValueChange={setFDepto}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os departamentos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={10} className="text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-sm text-muted-foreground">
                  Nenhum funcionário encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>{f.cpf ? formatarCpf(f.cpf) : "—"}</TableCell>
                <TableCell>{nomeEmpresa(f.empresa_id)}</TableCell>
                <TableCell>{f.cargo || "—"}</TableCell>
                <TableCell>{f.departamento || "—"}</TableCell>
                <TableCell>{nomeJornada(f.jornada_id)}</TableCell>
                <TableCell>{f.tipo_contrato === "clt" ? "CLT" : "Estagiário"}</TableCell>
                <TableCell>
                  <Badge variant={f.ativo ? "secondary" : "outline"}>
                    {f.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ROTULO_ACESSO[f.acesso_status ?? "sem_acesso"]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setAcesso(f)}>Acesso</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDetalhe(f)}>
                      <Eye className="size-4" aria-hidden />
                      <span className="sr-only">Detalhes</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(f)}>
                      <Pencil className="size-4" aria-hidden />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => alternarStatus.mutate(f)}>
                      {f.ativo ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AcessoDialog func={acesso} onClose={() => setAcesso(null)} />

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              salvar.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fnome">Nome completo *</Label>
              <Input
                id="fnome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcpf">CPF *</Label>
              <Input
                id="fcpf"
                required
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatarCpf(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fnasc">Data de nascimento</Label>
              <Input
                id="fnasc"
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="femail">E-mail</Label>
              <Input
                id="femail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ftel">Telefone</Label>
              <Input
                id="ftel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={form.empresa_id}
                onValueChange={(v) => setForm({ ...form, empresa_id: v, jornada_id: "" })}
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
              <Label>Jornada</Label>
              <Select
                value={form.jornada_id || SEM_JORNADA}
                onValueChange={(v) => setForm({ ...form, jornada_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_JORNADA}>Sem jornada</SelectItem>
                  {jornadasDaEmpresa.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcargo">Cargo</Label>
              <Input
                id="fcargo"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fdep">Departamento</Label>
              <Input
                id="fdep"
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fadm">Data de admissão</Label>
              <Input
                id="fadm"
                type="date"
                value={form.data_admissao}
                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de contrato *</Label>
              <Select
                value={form.tipo_contrato}
                onValueChange={(v) =>
                  setForm({ ...form, tipo_contrato: v as "clt" | "estagiario" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="estagiario">Estagiário</SelectItem>
                </SelectContent>
              </Select>
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
              ["CPF", detalhe?.cpf ? formatarCpf(detalhe.cpf) : null],
              ["Nascimento", dataBr(detalhe?.data_nascimento)],
              ["E-mail", detalhe?.email],
              ["Telefone", detalhe?.telefone],
              ["Empresa", detalhe ? nomeEmpresa(detalhe.empresa_id) : null],
              ["Cargo", detalhe?.cargo],
              ["Departamento", detalhe?.departamento],
              ["Admissão", dataBr(detalhe?.data_admissao)],
              ["Contrato", detalhe?.tipo_contrato === "clt" ? "CLT" : "Estagiário"],
              ["Jornada", detalhe ? nomeJornada(detalhe.jornada_id) : null],
              ["Status", detalhe?.ativo ? "Ativo" : "Inativo"],
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
