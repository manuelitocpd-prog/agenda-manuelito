CREATE POLICY "Leitura pública das agendas"
ON public.agendas
FOR SELECT
TO public
USING (true);