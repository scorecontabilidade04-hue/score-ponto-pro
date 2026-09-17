import { supabase } from "@/integrations/supabase/client";

export type Empresa = {
  id: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
};

export async function listarEmpresas() {
  const { data, error } = await supabase
    .from("empresas")
    .select(
      "id, nome, razao_social, nome_fantasia, cnpj, endereco, telefone, email, ativo, criado_por, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Empresa[];
}

export async function usuarioAtual() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
