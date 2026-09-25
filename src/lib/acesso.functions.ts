import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function hashPin(pin: string, token: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${token}:${pin}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function exigirAdmin(ctx: { supabase: any; userId: string }, funcionarioId: string) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Apenas administradores podem gerenciar acessos.");
  const { data: f, error } = await ctx.supabase
    .from("funcionarios").select("id, empresa_id, nome, user_id, acesso_status").eq("id", funcionarioId).single();
  if (error || !f) throw new Error("Funcionário não encontrado.");
  return f as { id: string; empresa_id: string; nome: string; user_id: string | null; acesso_status: string };
}

export const gerarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      funcionarioId: z.string().uuid(),
      email: z.string().trim().email().max(255),
      pin: z.string().regex(/^\d{4,8}$/, "PIN deve ter de 4 a 8 números"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const f = await exigirAdmin(context, data.funcionarioId);
    if (f.acesso_status === "ativo") throw new Error("Este funcionário já possui acesso ativo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await supabaseAdmin.from("convites_usuario").update({ status: "substituido" })
      .eq("funcionario_id", f.id).eq("status", "enviado");
    const { error } = await supabaseAdmin.from("convites_usuario").insert({
      empresa_id: f.empresa_id, funcionario_id: f.id, email: data.email.toLowerCase(),
      token, pin_hash: await hashPin(data.pin, token), criado_por: context.userId,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("funcionarios")
      .update({ acesso_email: data.email.toLowerCase(), acesso_status: "convite_enviado" }).eq("id", f.id);
    return { token };
  });

export const alterarBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ funcionarioId: z.string().uuid(), bloquear: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const f = await exigirAdmin(context, data.funcionarioId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (f.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(f.user_id, {
        ban_duration: data.bloquear ? "876000h" : "none",
      });
      await supabaseAdmin.from("profiles")
        .update({ status_acesso: data.bloquear ? "bloqueado" : "ativo" }).eq("id", f.user_id);
    } else if (data.bloquear) {
      await supabaseAdmin.from("convites_usuario").update({ status: "cancelado" })
        .eq("funcionario_id", f.id).eq("status", "enviado");
    }
    const novo = data.bloquear ? "bloqueado" : f.user_id ? "ativo" : "sem_acesso";
    await supabaseAdmin.from("funcionarios").update({ acesso_status: novo }).eq("id", f.id);
    return { status: novo };
  });

// Público: ativação pelo próprio funcionário (e-mail + PIN + token do link)
export const ativarAcesso = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string().min(20).max(200),
      email: z.string().trim().email().max(255),
      pin: z.string().regex(/^\d{4,8}$/),
      senha: z.string().min(8).max(72),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const invalido = new Error("Convite inválido, expirado ou dados incorretos.");
    const { data: c } = await supabaseAdmin.from("convites_usuario").select("*").eq("token", data.token).maybeSingle();
    if (!c || c.status !== "enviado" || new Date(c.data_expiracao) < new Date()) throw invalido;
    if (c.email !== data.email.toLowerCase() || c.pin_hash !== (await hashPin(data.pin, data.token))) throw invalido;

    const { data: f } = await supabaseAdmin.from("funcionarios").select("id, nome, empresa_id").eq("id", c.funcionario_id).single();
    if (!f) throw invalido;

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: c.email, password: data.senha, email_confirm: true, user_metadata: { nome: f.nome },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Não foi possível criar o acesso.");
    const uid = criado.user.id;
    const agora = new Date().toISOString();

    // O gatilho de cadastro concede admin por padrão; funcionário recebe apenas o perfil "funcionario".
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "funcionario" });
    await supabaseAdmin.from("profiles").update({
      empresa_id: f.empresa_id, funcionario_id: f.id, perfil: "funcionario",
      status_acesso: "ativo", data_ativacao: agora,
    }).eq("id", uid);
    await supabaseAdmin.from("funcionarios").update({ user_id: uid, acesso_status: "ativo", data_ativacao: agora }).eq("id", f.id);
    await supabaseAdmin.from("convites_usuario").update({ status: "usado", usuario_id: uid }).eq("id", c.id);
    return { ok: true };
  });
