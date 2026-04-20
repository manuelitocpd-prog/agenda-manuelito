
-- Tabela de agendas
CREATE TABLE public.agendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma TEXT NOT NULL,
  semana_inicio DATE NOT NULL,
  blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode inserir uma agenda (professoras sem login)
CREATE POLICY "Qualquer um pode enviar agenda"
  ON public.agendas FOR INSERT
  WITH CHECK (true);

-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin');

-- Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin pode ver todas as agendas
CREATE POLICY "Admin lê todas as agendas"
  ON public.agendas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin pode deletar
CREATE POLICY "Admin deleta agendas"
  ON public.agendas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários autenticados leem seus roles
CREATE POLICY "Usuário lê próprio role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
