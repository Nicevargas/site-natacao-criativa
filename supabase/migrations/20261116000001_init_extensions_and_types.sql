-- ============================================================================
-- Migration 0001: Extensions & Custom Enum Types
-- Platform: Natação Criativa
-- ============================================================================

-- Useful extensions for UUID generation, case-insensitive search, and accent-insensitive PT-BR filtering
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions;

-- User & community roles
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'admin',
    'coordinator',
    'instructor',
    'student',
    'manager',
    'family'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Course / formation categories
DO $$ BEGIN
  CREATE TYPE public.course_category AS ENUM (
    'pos_graduacao',
    'especializacao',
    'curso_pratico',
    'workshop',
    'palestra',
    'imersao',
    'grupo_estudos',
    'treino',
    'guia_aberto'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Thematic areas for catalog filtering
DO $$ BEGIN
  CREATE TYPE public.course_theme AS ENUM (
    'natacao_infantil',
    'biomecanica',
    'personal_aquatico',
    'seguranca_salvamento',
    'gestao_escolas',
    'geral'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Delivery formats
DO $$ BEGIN
  CREATE TYPE public.course_format AS ENUM (
    'online_gravado',
    'online_ao_vivo',
    'online_hibrido',
    'presencial',
    'hibrido'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Technical skill level
DO $$ BEGIN
  CREATE TYPE public.course_level AS ENUM (
    'iniciacao',
    'intermediario',
    'avancado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Publication & enrollment availability status
DO $$ BEGIN
  CREATE TYPE public.course_status AS ENUM (
    'aberto',
    'em_breve',
    'gravacao',
    'encerrado',
    'rascunho'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Commercial batch (lote) status
DO $$ BEGIN
  CREATE TYPE public.lot_status AS ENUM (
    'programado',
    'vigente',
    'esgotado',
    'encerrado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Student enrollment status
DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM (
    'pendente',
    'confirmada',
    'concluida',
    'cancelada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ecosystem media channels
DO $$ BEGIN
  CREATE TYPE public.content_channel AS ENUM (
    'instagram',
    'spotify',
    'youtube',
    'ebook',
    'artigo'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Contact / suggestion / private lesson inquiry types
DO $$ BEGIN
  CREATE TYPE public.inquiry_type AS ENUM (
    'aula_particular',
    'sugestao_tema',
    'consultoria_academia',
    'suporte'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;
