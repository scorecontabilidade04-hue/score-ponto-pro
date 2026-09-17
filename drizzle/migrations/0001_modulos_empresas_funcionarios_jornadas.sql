-- Tipo de contrato
DO $$ BEGIN
  CREATE TYPE public.tipo_contrato AS ENUM ('clt', 'estagiario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- EMPRESAS: campos cadastrais
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS criado_por uuid;

UPDATE public.empresas SET razao_social = nome WHERE razao_social IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS empresas_cnpj_unico
  ON public.empresas (cnpj) WHERE cnpj IS NOT NULL;

-- FUNCIONARIOS: campos pessoais e profissionais
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS data_admissao date,
  ADD COLUMN IF NOT EXISTS tipo_contrato public.tipo_contrato NOT NULL DEFAULT 'clt';

CREATE UNIQUE INDEX IF NOT EXISTS funcionarios_cpf_empresa_unico
  ON public.funcionarios (empresa_id, cpf) WHERE cpf IS NOT NULL;

-- JORNADAS: horários e regras
ALTER TABLE public.jornadas
  ADD COLUMN IF NOT EXISTS hora_entrada time,
  ADD COLUMN IF NOT EXISTS hora_saida time,
  ADD COLUMN IF NOT EXISTS intervalo_inicio time,
  ADD COLUMN IF NOT EXISTS intervalo_fim time,
  ADD COLUMN IF NOT EXISTS dias_trabalhados text,
  ADD COLUMN IF NOT EXISTS dias_descanso text,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- HISTORICO DE JORNADAS (permite troca futura mantendo uma ativa por vez)
CREATE TABLE IF NOT EXISTS public.funcionario_jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  jornada_id uuid NOT NULL REFERENCES public.jornadas(id),
  inicio_em date NOT NULL DEFAULT CURRENT_DATE,
  fim_em date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS funcionario_uma_jornada_ativa
  ON public.funcionario_jornadas (funcionario_id) WHERE fim_em IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionario_jornadas TO authenticated;
GRANT ALL ON public.funcionario_jornadas TO service_role;
ALTER TABLE public.funcionario_jornadas ENABLE ROW LEVEL SECURITY;

-- Helper: usuário pode gerir a empresa (a sua própria ou as que ele criou)
CREATE OR REPLACE FUNCTION public.pode_gerir_empresa(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresas e
    WHERE e.id = _empresa_id
      AND (e.criado_por = _user_id OR e.id = public.empresa_atual(_user_id))
  )
$$;

CREATE POLICY "hist jornadas leitura" ON public.funcionario_jornadas
  FOR SELECT TO authenticated USING (public.pode_gerir_empresa(auth.uid(), empresa_id));
CREATE POLICY "hist jornadas escrita" ON public.funcionario_jornadas
  FOR ALL TO authenticated
  USING (public.pode_gerir_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.pode_gerir_empresa(auth.uid(), empresa_id));

-- Empresas criadas pelo usuário ficam visíveis/editáveis por ele
CREATE POLICY "ver empresas que criei" ON public.empresas
  FOR SELECT TO authenticated USING (criado_por = auth.uid());
CREATE POLICY "editar empresas que criei" ON public.empresas
  FOR UPDATE TO authenticated USING (criado_por = auth.uid()) WITH CHECK (criado_por = auth.uid());

-- Funcionários e jornadas das empresas geridas
CREATE POLICY "funcionarios empresas geridas" ON public.funcionarios
  FOR ALL TO authenticated
  USING (public.pode_gerir_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.pode_gerir_empresa(auth.uid(), empresa_id));

CREATE POLICY "jornadas empresas geridas" ON public.jornadas
  FOR ALL TO authenticated
  USING (public.pode_gerir_empresa(auth.uid(), empresa_id))
  WITH CHECK (public.pode_gerir_empresa(auth.uid(), empresa_id));
