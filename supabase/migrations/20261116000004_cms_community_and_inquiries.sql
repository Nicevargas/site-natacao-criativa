-- ============================================================================
-- Migration 0004: CMS Highlights, Ecosystem Content, Testimonials, Cardume & Settings
-- Platform: Natação Criativa
-- ============================================================================

-- 1. Hero Carousel Highlights (Destaques da Home)
CREATE TABLE IF NOT EXISTS public.hero_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_label text NOT NULL,
  badge_icon text NOT NULL DEFAULT 'school',
  title text NOT NULL,
  subtitle text NOT NULL,
  cta_label text NOT NULL DEFAULT 'Conheça a formação',
  cta_url text NOT NULL DEFAULT '/formacoes',
  trust_badge_label text,
  trust_badge_icon text DEFAULT 'verified',
  image_url text NOT NULL,
  image_alt text,
  image_caption text,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_hero_highlights_updated_at
  BEFORE UPDATE ON public.hero_highlights
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Ecosystem Media & Educational Content (Instagram, Spotify Podcast, YouTube, E-books)
CREATE TABLE IF NOT EXISTS public.ecosystem_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel public.content_channel NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  external_url text NOT NULL DEFAULT '#',
  cta_label text NOT NULL,
  thumbnail_url text,
  thumbnail_alt text,
  badge_meta text,
  episode_number integer,
  duration_minutes integer,
  is_featured boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ecosystem_contents_channel ON public.ecosystem_contents(channel, is_published, published_at DESC);

CREATE TRIGGER trg_ecosystem_contents_updated_at
  BEFORE UPDATE ON public.ecosystem_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Testimonials & Reviews (Depoimentos & Avaliações)
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role_location text NOT NULL,
  quote text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  is_verified boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_testimonials_published ON public.testimonials(is_published, sort_order);

CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Cardume Criativo Newsletter & Community Subscribers
CREATE TABLE IF NOT EXISTS public.cardume_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  profile_type text NOT NULL DEFAULT 'professor'
    CHECK (profile_type IN ('professor', 'gestor', 'familia', 'aluno', 'outro')),
  source_page text DEFAULT 'home',
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'descadastrado')),
  subscribed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  unsubscribed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cardume_subscribers_email
  ON public.cardume_subscribers(lower(email));

-- 5. Inquiries (Aulas Particulares, Sugestão de Temas, Consultoria & Atendimento)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type public.inquiry_type NOT NULL DEFAULT 'suporte',
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  profile_type text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'resolvido')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status, created_at DESC);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Site Settings & Trajectory Metrics ("Números da Trajetória" + Configurações do Site)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
