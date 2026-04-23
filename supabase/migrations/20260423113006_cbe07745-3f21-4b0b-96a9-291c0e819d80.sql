CREATE POLICY "Atualização pública das agendas"
  ON public.agendas FOR UPDATE
  TO public USING (true) WITH CHECK (true);