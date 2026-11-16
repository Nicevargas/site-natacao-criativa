-- ============================================================================
-- Migration 0003: Enrollments, Waitlist, Certificates & Capacity Sync
-- Platform: Natação Criativa
-- ============================================================================

-- 1. Student Enrollments (Matrículas)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES public.course_lots(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text,
  status public.enrollment_status NOT NULL DEFAULT 'pendente',
  amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  enrolled_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_course_user_active
  ON public.enrollments(course_id, user_id)
  WHERE user_id IS NOT NULL AND status <> 'cancelada';

CREATE TRIGGER trg_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Waitlist (Lista de Espera para turmas "Em Breve" ou "Encerradas")
CREATE TABLE IF NOT EXISTS public.course_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  profile_type text DEFAULT 'professor',
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_course_email
  ON public.course_waitlist(course_id, lower(email));

-- 3. Certificates & Validation (Certificados Chancelados)
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid UNIQUE REFERENCES public.enrollments(id) ON DELETE SET NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  validation_code text NOT NULL UNIQUE DEFAULT ('NC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  recipient_name text NOT NULL,
  course_title text NOT NULL,
  workload_hours integer NOT NULL DEFAULT 0,
  chancela_info text DEFAULT 'Conformidade CREF / Natação Criativa',
  pdf_url text,
  is_valid boolean NOT NULL DEFAULT true,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_certificates_validation_code ON public.certificates(validation_code);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);

-- 4. Triggers to keep course & lot counters consistent when enrollments/waitlist change
CREATE OR REPLACE FUNCTION public.sync_course_enrollment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_course_id uuid;
  target_lot_id uuid;
BEGIN
  target_course_id := COALESCE(NEW.course_id, OLD.course_id);
  target_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);

  UPDATE public.courses
  SET enrolled_count = (
    SELECT count(*)
    FROM public.enrollments e
    WHERE e.course_id = target_course_id
      AND e.status IN ('confirmada', 'concluida')
  )
  WHERE id = target_course_id;

  IF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    UPDATE public.courses
    SET enrolled_count = (
      SELECT count(*)
      FROM public.enrollments e
      WHERE e.course_id = OLD.course_id
        AND e.status IN ('confirmada', 'concluida')
    )
    WHERE id = OLD.course_id;
  END IF;

  IF target_lot_id IS NOT NULL THEN
    UPDATE public.course_lots
    SET sold_slots = (
      SELECT count(*)
      FROM public.enrollments e
      WHERE e.lot_id = target_lot_id
        AND e.status IN ('confirmada', 'concluida')
    )
    WHERE id = target_lot_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.lot_id IS NOT NULL AND OLD.lot_id IS DISTINCT FROM NEW.lot_id THEN
    UPDATE public.course_lots
    SET sold_slots = (
      SELECT count(*)
      FROM public.enrollments e
      WHERE e.lot_id = OLD.lot_id
        AND e.status IN ('confirmada', 'concluida')
    )
    WHERE id = OLD.lot_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_enrollment_counts ON public.enrollments;
CREATE TRIGGER trg_sync_enrollment_counts
  AFTER INSERT OR UPDATE OF status, lot_id OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_enrollment_counts();

CREATE OR REPLACE FUNCTION public.sync_course_waitlist_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_course_id uuid;
BEGIN
  target_course_id := COALESCE(NEW.course_id, OLD.course_id);

  UPDATE public.courses
  SET waitlist_count = (
    SELECT count(*)
    FROM public.course_waitlist w
    WHERE w.course_id = target_course_id
  )
  WHERE id = target_course_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_waitlist_counts ON public.course_waitlist;
CREATE TRIGGER trg_sync_waitlist_counts
  AFTER INSERT OR DELETE ON public.course_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_waitlist_counts();
