-- ============================================================================
-- Migration 0002: Profiles, Instructors, Courses, Lots & Audit Logs
-- Platform: Natação Criativa
-- ============================================================================

-- 1. User Profiles (1:1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'student',
  headline text,
  bio text,
  cref_number text,
  phone text,
  city text,
  state char(2),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Automatically provision a profile whenever a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Instructors / Faculty
CREATE TABLE IF NOT EXISTS public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  initials varchar(4) NOT NULL,
  role_title text NOT NULL,
  bio text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_instructors_updated_at
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Courses, Lectures, Workshops & Specializations (Formações)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  description text NOT NULL,
  category public.course_category NOT NULL DEFAULT 'curso_pratico',
  theme public.course_theme NOT NULL DEFAULT 'geral',
  format public.course_format NOT NULL DEFAULT 'online_gravado',
  level public.course_level NOT NULL DEFAULT 'iniciacao',
  target_audience text[] NOT NULL DEFAULT ARRAY['profissionais']::text[],
  status public.course_status NOT NULL DEFAULT 'rascunho',

  is_free boolean NOT NULL DEFAULT false,
  has_certificate boolean NOT NULL DEFAULT true,
  certificate_badge text DEFAULT 'Certificado Incluso',

  workload_hours integer CHECK (workload_hours IS NULL OR workload_hours >= 0),
  workload_label text,
  modality_details text,
  location_or_url text,
  city_state text,

  start_date date,
  start_date_label text,
  max_capacity integer NOT NULL DEFAULT 50 CHECK (max_capacity >= 0),
  enrolled_count integer NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  waitlist_count integer NOT NULL DEFAULT 0 CHECK (waitlist_count >= 0),

  display_price_cents integer NOT NULL DEFAULT 0 CHECK (display_price_cents >= 0),
  installments_count integer DEFAULT 1 CHECK (installments_count IS NULL OR installments_count >= 1),
  installment_value_cents integer CHECK (installment_value_cents IS NULL OR installment_value_cents >= 0),
  price_label text,

  cover_image_url text,
  cover_image_alt text,

  is_featured boolean NOT NULL DEFAULT false,
  featured_order integer,

  primary_instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  instructor_display_name text,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_theme ON public.courses(theme);
CREATE INDEX IF NOT EXISTS idx_courses_format ON public.courses(format);
CREATE INDEX IF NOT EXISTS idx_courses_is_featured ON public.courses(is_featured, featured_order);
CREATE INDEX IF NOT EXISTS idx_courses_target_audience ON public.courses USING GIN(target_audience);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Commercial Batches / Lots (Gestão de Lotes Comerciais)
CREATE TABLE IF NOT EXISTS public.course_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  max_slots integer NOT NULL DEFAULT 20 CHECK (max_slots >= 0),
  sold_slots integer NOT NULL DEFAULT 0 CHECK (sold_slots >= 0),
  status public.lot_status NOT NULL DEFAULT 'programado',
  sort_order integer NOT NULL DEFAULT 1,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_course_lots_course_id ON public.course_lots(course_id, sort_order);

CREATE TRIGGER trg_course_lots_updated_at
  BEFORE UPDATE ON public.course_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Course Audit Logs (Histórico de Alterações no Painel Admin)
CREATE TABLE IF NOT EXISTS public.course_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  course_code text,
  course_title text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'published', 'duplicated', 'status_changed', 'deleted')),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_course_audit_logs_course ON public.course_audit_logs(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_audit_logs_created_at ON public.course_audit_logs(created_at DESC);
