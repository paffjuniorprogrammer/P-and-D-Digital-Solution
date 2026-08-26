-- P&D Digital Solutions: secure database foundation
-- Run this in the SQL Editor of the Supabase project used by the website.
-- This migration does not expose the admin password hash and does not allow anonymous writes.

-- 1. Ensure the editable content tables exist.
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT,
  description TEXT,
  url TEXT NOT NULL,
  "imageUrl" TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  badge TEXT,
  "priceRange" TEXT NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Store visitor-facing contact data separately from the admin password hash.
CREATE TABLE IF NOT EXISTS public.public_contact_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.public_contact_settings (key, value)
SELECT key, value
FROM public.site_settings
WHERE key IN ('whatsappNumber', 'whatsappMessage', 'email')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- 3. Enable Row Level Security.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_contact_settings ENABLE ROW LEVEL SECURITY;

-- 4. Recreate policies idempotently.
DROP POLICY IF EXISTS "Public can read projects" ON public.projects;
CREATE POLICY "Public can read projects"
ON public.projects FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Authenticated admins manage projects" ON public.projects;
CREATE POLICY "Authenticated admins manage projects"
ON public.projects FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can read active offers" ON public.offers;
CREATE POLICY "Public can read active offers"
ON public.offers FOR SELECT
TO anon, authenticated
USING ("isActive" = TRUE);

DROP POLICY IF EXISTS "Authenticated admins manage offers" ON public.offers;
CREATE POLICY "Authenticated admins manage offers"
ON public.offers FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can read contact settings" ON public.public_contact_settings;
CREATE POLICY "Public can read contact settings"
ON public.public_contact_settings FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Authenticated admins manage contact settings" ON public.public_contact_settings;
CREATE POLICY "Authenticated admins manage contact settings"
ON public.public_contact_settings FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

-- 5. Helpful indexes for public reads.
CREATE INDEX IF NOT EXISTS projects_created_at_idx
ON public.projects (created_at DESC);

CREATE INDEX IF NOT EXISTS offers_active_created_at_idx
ON public.offers ("isActive", created_at DESC);

-- 6. Optional: seed contact values only if they exist in the old settings table.
-- The admin_password_hash row remains in site_settings and is intentionally not
-- included in public_contact_settings.

-- IMPORTANT NEXT STEP:
-- In Supabase Dashboard > Authentication > Users, create one admin user with
-- an email address and password. The frontend must sign in with Supabase Auth
-- before these authenticated write policies will allow edits.
