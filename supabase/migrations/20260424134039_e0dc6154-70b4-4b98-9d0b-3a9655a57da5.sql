CREATE TABLE public.disciplinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma, nome)
);

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de disciplinas"
  ON public.disciplinas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin gerencia disciplinas"
  ON public.disciplinas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));