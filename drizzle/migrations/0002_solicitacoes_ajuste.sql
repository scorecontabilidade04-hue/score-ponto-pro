CREATE TABLE public.solicitacoes_ajuste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id),
  registro_id uuid REFERENCES public.registros_ponto(id),
  data date NOT NULL,
  tipo tipo_registro NOT NULL,
  hora_solicitada timestamptz NOT NULL,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  solicitante_id uuid NOT NULL DEFAULT auth.uid(),
  analisado_por uuid,
  analisado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_ajuste TO authenticated;
GRANT ALL ON public.solicitacoes_ajuste TO service_role;
ALTER TABLE public.solicitacoes_ajuste ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solic ver" ON public.solicitacoes_ajuste FOR SELECT TO authenticated
  USING (solicitante_id = auth.uid() OR (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "solic criar" ON public.solicitacoes_ajuste FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid() AND status = 'pendente' AND empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "solic admin analisa" ON public.solicitacoes_ajuste FOR UPDATE TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(),'admin'));