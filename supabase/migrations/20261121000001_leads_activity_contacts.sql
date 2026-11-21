-- ============================================================================
-- Migration 0007: telefone e nascimento no Cardume, leads antes do pagamento
-- e atividade dos alunos no site. Só acrescenta; não altera dados existentes.
-- As duas tabelas novas têm RLS sem políticas: só o servidor (service_role) acessa.
-- ============================================================================

ALTER TABLE public.cardume_subscribers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date;

CREATE TABLE IF NOT EXISTS public.course_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text NOT NULL,
  course_title text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (course_code, email)
);
ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.site_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id text NOT NULL,
  email text,
  event_type text NOT NULL DEFAULT 'pagina',
  path text NOT NULL,
  label text,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_site_activity_created ON public.site_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_activity_visitor ON public.site_activity(visitor_id);
ALTER TABLE public.site_activity ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
