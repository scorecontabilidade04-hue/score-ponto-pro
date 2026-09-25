import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ativarAcesso } from "@/lib/acesso.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/ativar")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Ativar acesso — Score Ponto" },
      { name: "description", content: "Ative seu acesso ao Score Ponto com e-mail e PIN." },
      { property: "og:title", content: "Ativar acesso — Score Ponto" },
      { property: "og:description", content: "Ative seu acesso ao Score Ponto com e-mail e PIN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AtivarPage,
});

function AtivarPage() {
  const { token } = Route.useSearch();
  const ativar = useServerFn(ativarAcesso);
  const navigate = useNavigate();
  const [f, setF] = useState({ email: "", pin: "", senha: "", confirma: "" });
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (f.senha.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres."); return; }
    if (f.senha !== f.confirma) { toast.error("As senhas não conferem."); return; }
    setEnviando(true);
    try {
      await ativar({ data: { token: token ?? "", email: f.email, pin: f.pin, senha: f.senha } });
      toast.success("Conta ativada! Entre com seu e-mail e senha.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ativar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">Ativar acesso</h1>
          <p className="text-sm text-muted-foreground">Informe o e-mail e o PIN recebidos e crie sua senha.</p>
        </div>
        {!token && <p className="text-sm text-destructive">Link de ativação inválido.</p>}
        <div className="space-y-1"><Label>E-mail</Label>
          <Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1"><Label>PIN</Label>
          <Input inputMode="numeric" required value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="space-y-1"><Label>Nova senha</Label>
          <Input type="password" required value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /></div>
        <div className="space-y-1"><Label>Confirmar senha</Label>
          <Input type="password" required value={f.confirma} onChange={(e) => setF({ ...f, confirma: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={!token || enviando}>
          {enviando ? "Ativando..." : "Ativar conta"}
        </Button>
        <p className="text-center text-sm"><Link to="/auth" className="underline">Já tenho acesso</Link></p>
      </form>
    </div>
  );
}
