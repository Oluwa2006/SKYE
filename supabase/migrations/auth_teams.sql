-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Extended user info (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Team members ─────────────────────────────────────────────────────────────
-- Single workspace: all members share the same data.
-- "owner" = first signup, "member" = invited users.
CREATE TABLE IF NOT EXISTS public.team_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role         TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  joined_at    TIMESTAMPTZ
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view team" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert"    ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update"    ON public.team_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete"    ON public.team_members FOR DELETE TO authenticated USING (true);


-- ── Auto-activate pending invite on signup ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_team_invite_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.team_members
  SET status = 'active', user_id = NEW.id, joined_at = NOW(),
      display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  WHERE email = NEW.email AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_signup_activate_invite ON auth.users;
CREATE TRIGGER on_user_signup_activate_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_team_invite_on_signup();


-- ── Backfill existing auth users into team_members ───────────────────────────
-- Run this once after applying the migration if you already have users:
-- INSERT INTO public.team_members (user_id, email, display_name, role, status, joined_at)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'display_name', split_part(email,'@',1)), 'owner', 'active', created_at
-- FROM auth.users
-- ON CONFLICT (email) DO NOTHING;
