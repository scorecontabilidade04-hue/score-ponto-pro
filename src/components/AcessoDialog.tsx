import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gerarConvite, alterarBloqueio } from "@/lib/acesso.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const ROTULO_ACESSO: Record<string, string> = {
  sem_acesso: "Sem acesso",
  convite_enviado: "Convite enviado",
  ativo: "Ativo",
  bloqueado: "Bloqueado",
};

type F = { id: string; nome: string; email: string | null; acesso_email?: string | null; acesso_status?: string; user_id?: string | null };

export function AcessoDialog({ func, onClose }: { func: F | null; onClose: () => void }) {
  const qc = useQueryClient();
  const convidar = useServerFn(gerarConvite);
  const bloquear = useServerFn(alterarBloqueio);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [link, setLink] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setEmail(func?.acesso_email || func?.email || "");
    setPin(String(Math.floor(100000 + Math.random() * 900000)));
    setLink("");
  }, [func]);

  const status = func?.acesso_status ?? "sem_acesso";

  async function rodar(fn: () => Promise<void>) {
    setOcupado(true);
    try { await fn(); qc.invalidateQueries({ queryKey: ["funcionarios"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setOcupado(false); }
  }

  return (
    <Dialog open={!!func} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dados de acesso — {func?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">Status: <Badge variant="secondary">{ROTULO_ACESSO[status]}</Badge></div>
          {status !== "ativo" && status !== "bloqueado" && (
            <>
              <div className="space-y-1"><Label>E-mail de acesso *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label>PIN inicial * (usado só na ativação)</Label>
                <Input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
              <Button disabled={ocupado} onClick={() => rodar(async () => {
                const r = await convidar({ data: { funcionarioId: func!.id, email, pin } });
                setLink(`${window.location.origin}/ativar?token=${r.token}`);
                toast.success("Convite gerado.");
              })}>{status === "convite_enviado" ? "Reenviar convite" : "Gerar convite"}</Button>
            </>
          )}
          {link && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p>Envie ao funcionário o link e o PIN <strong>{pin}</strong>:</p>
              <Input readOnly value={link} onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${link}\nPIN: ${pin}`); toast.success("Copiado"); }}>Copiar link e PIN</Button>
            </div>
          )}
          {status !== "sem_acesso" && (
            <Button variant={status === "bloqueado" ? "default" : "destructive"} disabled={ocupado}
              onClick={() => rodar(async () => {
                await bloquear({ data: { funcionarioId: func!.id, bloquear: status !== "bloqueado" } });
                toast.success(status === "bloqueado" ? "Acesso desbloqueado." : "Acesso bloqueado.");
                onClose();
              })}>
              {status === "bloqueado" ? "Desbloquear acesso" : "Bloquear acesso"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
