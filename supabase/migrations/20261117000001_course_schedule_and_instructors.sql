-- ============================================================================
-- Migration 0006: dias, horários e vários docentes por formação
-- Platform: Natação Criativa
--
-- schedule:    lista de dias  [{"date":"2026-03-14","start":"19:00","end":"22:00"}, ...]
-- instructors: lista de docentes  [{"name":"Renato Simon","role":"Docente titular"}, ...]
-- end_date:    último dia da formação (start_date continua sendo o primeiro)
-- ============================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instructors jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.courses.schedule IS 'Dias da formação: [{date, start, end}] (datas AAAA-MM-DD, horários HH:MM)';
COMMENT ON COLUMN public.courses.instructors IS 'Docentes da formação: [{name, role}] — o primeiro é o principal';

-- Avisa a API do Supabase que a tabela mudou
NOTIFY pgrst, 'reload schema';
