-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'funcionario');
CREATE TYPE public.tipo_jornada AS ENUM ('fixa','variavel','5x2','6x1','12x36','semana_espanhola','estagio');
CREATE TYPE public.tipo_registro AS ENUM ('entrada','saida_intervalo','retorno_intervalo','saida');

-- EMPRESAS
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  configuracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- PROFILES (usuários)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.empresa_atual(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), COALESCE(NEW.email, ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- JORNADAS
CREATE TABLE public.jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.tipo_jornada NOT NULL DEFAULT 'fixa',
  carga_diaria_minutos integer NOT NULL DEFAULT 480,
  carga_semanal_minutos integer NOT NULL DEFAULT 2640,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornadas TO authenticated;
GRANT ALL ON public.jornadas TO service_role;
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

-- FUNCIONARIOS
CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  cargo text,
  departamento text,
  jornada_id uuid REFERENCES public.jornadas(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- REGISTROS DE PONTO
CREATE TABLE public.registros_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  hora timestamptz NOT NULL DEFAULT now(),
  tipo public.tipo_registro NOT NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  dispositivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_ponto TO authenticated;
GRANT ALL ON public.registros_ponto TO service_role;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- AJUSTES
CREATE TABLE public.ajustes_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  registro_id uuid NOT NULL REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
  valor_anterior text,
  valor_novo text,
  motivo text NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ajustes_ponto TO authenticated;
GRANT ALL ON public.ajustes_ponto TO service_role;
ALTER TABLE public.ajustes_ponto ENABLE ROW LEVEL SECURITY;

-- BANCO DE HORAS
CREATE TABLE public.banco_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  credito_minutos integer NOT NULL DEFAULT 0,
  debito_minutos integer NOT NULL DEFAULT 0,
  saldo_minutos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas TO authenticated;
GRANT ALL ON public.banco_horas TO service_role;
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
CREATE POLICY "ver propria empresa" ON public.empresas FOR SELECT TO authenticated
  USING (id = public.empresa_atual(auth.uid()));
CREATE POLICY "criar empresa" ON public.empresas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin atualiza empresa" ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ver proprio perfil" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (empresa_id IS NOT NULL AND empresa_id = public.empresa_atual(auth.uid())));
CREATE POLICY "atualizar proprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "ver proprios papeis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "jornadas empresa" ON public.jornadas FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "jornadas admin" ON public.jornadas FOR ALL TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "funcionarios empresa" ON public.funcionarios FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "funcionarios admin" ON public.funcionarios FOR ALL TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "registros empresa" ON public.registros_ponto FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "registros insert" ON public.registros_ponto FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "registros admin edita" ON public.registros_ponto FOR UPDATE TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ajustes empresa" ON public.ajustes_ponto FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "ajustes admin" ON public.ajustes_ponto FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "banco horas empresa" ON public.banco_horas FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()));
CREATE POLICY "banco horas admin" ON public.banco_horas FOR ALL TO authenticated
  USING (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_id = public.empresa_atual(auth.uid()) AND public.has_role(auth.uid(), 'admin'));