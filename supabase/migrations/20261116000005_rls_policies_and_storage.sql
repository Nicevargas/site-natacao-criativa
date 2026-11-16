-- ============================================================================
-- Migration 0005: Row Level Security (RLS), Public RPCs & Storage Buckets
-- Platform: Natação Criativa
-- ============================================================================

-- Helper function: checks whether the authenticated user has admin/coordinator role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'coordinator')
  );
$$;

-- Enable RLS on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardume_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- INSTRUCTORS
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can view active instructors"
  ON public.instructors FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage instructors"
  ON public.instructors FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- COURSES & LOTS
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view published courses (excluding drafts)"
  ON public.courses FOR SELECT
  USING (status <> 'rascunho' OR public.is_admin());

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view lots of published courses"
  ON public.course_lots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_lots.course_id
        AND (c.status <> 'rascunho' OR public.is_admin())
    )
  );

CREATE POLICY "Admins can manage course lots"
  ON public.course_lots FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- COURSE AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE POLICY "Only admins can view or insert audit logs"
  ON public.course_audit_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ENROLLMENTS & WAITLIST
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can enroll themselves"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all enrollments"
  ON public.enrollments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can join course waitlist"
  ON public.course_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users see own waitlist entries or admins see all"
  ON public.course_waitlist FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage waitlist"
  ON public.course_waitlist FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- CERTIFICATES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage certificates"
  ON public.certificates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public certificate validation RPC (only returns non-sensitive public verification info)
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS TABLE (
  validation_code text,
  recipient_name text,
  course_title text,
  workload_hours integer,
  chancela_info text,
  is_valid boolean,
  issued_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.validation_code,
    c.recipient_name,
    c.course_title,
    c.workload_hours,
    c.chancela_info,
    c.is_valid,
    c.issued_at
  FROM public.certificates c
  WHERE upper(c.validation_code) = upper(trim(p_code))
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- HERO HIGHLIGHTS, ECOSYSTEM CONTENTS, TESTIMONIALS & SITE SETTINGS
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view active hero highlights"
  ON public.hero_highlights FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage hero highlights"
  ON public.hero_highlights FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view published ecosystem contents"
  ON public.ecosystem_contents FOR SELECT
  USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can manage ecosystem contents"
  ON public.ecosystem_contents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view published testimonials"
  ON public.testimonials FOR SELECT
  USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site settings"
  ON public.site_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- CARDUME SUBSCRIBERS & INQUIRIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can subscribe to Cardume Criativo"
  ON public.cardume_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage Cardume subscribers"
  ON public.cardume_subscribers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can submit an inquiry or topic suggestion"
  ON public.inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage inquiries"
  ON public.inquiries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- SUPABASE STORAGE BUCKETS & POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('course-covers', 'course-covers', true),
  ('avatars', 'avatars', true),
  ('certificates', 'certificates', false),
  ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

-- Public read for course covers and avatars
CREATE POLICY "Public read access for course covers"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('course-covers', 'avatars'));

-- Admin write access for course covers, avatars, certificates, and materials
CREATE POLICY "Admins can upload/manage platform storage assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id IN ('course-covers', 'avatars', 'certificates', 'materials')
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id IN ('course-covers', 'avatars', 'certificates', 'materials')
    AND public.is_admin()
  );

-- Authenticated students can download their own certificate PDFs (stored under {user_id}/...)
CREATE POLICY "Users can read their own certificate PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enrolled students can download course materials (stored under {course_id}/...)
CREATE POLICY "Enrolled students can read course materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.status IN ('confirmada', 'concluida')
        AND e.course_id::text = (storage.foldername(name))[1]
    )
  );

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
