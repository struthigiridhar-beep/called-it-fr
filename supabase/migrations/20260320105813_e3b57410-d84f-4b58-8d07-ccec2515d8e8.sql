
-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#7B9EC8',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_bet_at TIMESTAMPTZ
);

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.group_members (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 100,
  streak INTEGER NOT NULL DEFAULT 0,
  judge_integrity NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

-- Markets
CREATE TYPE public.market_status AS ENUM ('open', 'closed', 'resolved', 'disputed');
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  deadline TIMESTAMPTZ NOT NULL,
  min_bet INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status public.market_status NOT NULL DEFAULT 'open',
  yes_pool INTEGER NOT NULL DEFAULT 0,
  no_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bets
CREATE TYPE public.bet_side AS ENUM ('yes', 'no');
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  side public.bet_side NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verdicts
CREATE TYPE public.verdict_outcome AS ENUM ('yes', 'no');
CREATE TABLE public.verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verdict public.verdict_outcome NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disputes
CREATE TYPE public.dispute_status AS ENUM ('open', 'upheld', 'overturned');
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verdict_id UUID NOT NULL REFERENCES public.verdicts(id) ON DELETE CASCADE,
  status public.dispute_status NOT NULL DEFAULT 'open',
  flags INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TYPE public.transaction_type AS ENUM ('bet', 'payout', 'bonus', 'penalty', 'refund');
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roasts
CREATE TABLE public.roasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invites
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Groups (now group_members exists)
CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT TO authenticated
  USING (id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()) OR is_public = true);
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update group" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Group members
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()));
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.group_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Markets
CREATE POLICY "Group members can view markets" ON public.markets FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Group members can create markets" ON public.markets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Creator can update market" ON public.markets FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Bets
CREATE POLICY "Users can view bets in their groups" ON public.bets FOR SELECT TO authenticated
  USING (market_id IN (SELECT id FROM public.markets WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())));
CREATE POLICY "Users can place bets" ON public.bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Verdicts
CREATE POLICY "Group members can view verdicts" ON public.verdicts FOR SELECT TO authenticated
  USING (market_id IN (SELECT id FROM public.markets WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())));
CREATE POLICY "Judge can insert verdict" ON public.verdicts FOR INSERT TO authenticated WITH CHECK (auth.uid() = judge_id);

-- Disputes
CREATE POLICY "Group members can view disputes" ON public.disputes FOR SELECT TO authenticated
  USING (verdict_id IN (SELECT id FROM public.verdicts WHERE market_id IN (SELECT id FROM public.markets WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))));
CREATE POLICY "Authenticated users can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (true);

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Roasts
CREATE POLICY "Group members can view roasts" ON public.roasts FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Group members can create roasts" ON public.roasts FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);

-- Reactions
CREATE POLICY "Authenticated users can view reactions" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Invites
CREATE POLICY "Anyone can view invites" ON public.invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Group members can create invites" ON public.invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update invite" ON public.invites FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    '#7B9EC8'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_markets_group ON public.markets(group_id);
CREATE INDEX idx_bets_market ON public.bets(market_id);
CREATE INDEX idx_bets_user ON public.bets(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_roasts_group ON public.roasts(group_id);
CREATE INDEX idx_invites_code ON public.invites(code);
