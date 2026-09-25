ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS acesso_email text,
  ADD COLUMN IF NOT EXISTS acesso_status text NOT NULL DEFAULT 'sem_acesso',
  ADD COLUMN IF NOT EXISTS data_ativacao timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS perfil text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS status_acesso text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS data_ativacao timestamptz;

CREATE TABLE public.convites_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  usuario_id uuid,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  status text NOT NULL DEFAULT 'enviado',
  data_envio timestamptz NOT NULL DEFAULT now(),
  data_expiracao timestamptz NOT NULL DEFAULT now() + interval '7 days',
  criado_por uuid DEFAULT auth.uid()
);
GRANT SELECT ON public.convites_usuario TO authenticated;
GRANT ALL ON public.convites_usuario TO service_role;
ALTER TABLE public.convites_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convites admin ver" ON public.convites_usuario FOR SELECT TO authenticated
  USING (public.pode_gerir_empresa(auth.uid(), empresa_id) AND public.has_role(auth.uid(), 'admin'));
REVOKE SELECT (pin_hash, token) ON public.convites_usuario FROM authenticated;