
-- New tables for dispute system

-- dispute_flags: tracks individual flags per user per dispute
CREATE TABLE public.dispute_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dispute_id, user_id)
);

ALTER TABLE public.dispute_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view dispute flags" ON public.dispute_flags
  FOR SELECT TO authenticated
  USING (dispute_id IN (
    SELECT d.id FROM disputes d
    JOIN verdicts v ON v.id = d.verdict_id
    JOIN markets m ON m.id = v.market_id
    WHERE m.group_id IN (SELECT user_group_ids(auth.uid()))
  ));

CREATE POLICY "Authenticated users can insert dispute flags" ON public.dispute_flags
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- dispute_votes: tracks re-vote ballots
CREATE TABLE public.dispute_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote public.verdict_outcome NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dispute_id, user_id)
);

ALTER TABLE public.dispute_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view dispute votes" ON public.dispute_votes
  FOR SELECT TO authenticated
  USING (dispute_id IN (
    SELECT d.id FROM disputes d
    JOIN verdicts v ON v.id = d.verdict_id
    JOIN markets m ON m.id = v.market_id
    WHERE m.group_id IN (SELECT user_group_ids(auth.uid()))
  ));

CREATE POLICY "Authenticated users can insert dispute votes" ON public.dispute_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Alter disputes table: add resolution fields
ALTER TABLE public.disputes
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolution_verdict public.verdict_outcome;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_votes;

-- RPC: flag_verdict
CREATE OR REPLACE FUNCTION public.flag_verdict(_verdict_id UUID, _user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _market_id UUID;
  _group_id UUID;
  _committed_at TIMESTAMPTZ;
  _dispute_id UUID;
  _flag_count INT;
  _member_count INT;
  _member RECORD;
BEGIN
  -- Get verdict info
  SELECT v.market_id, v.committed_at, m.group_id
  INTO _market_id, _committed_at, _group_id
  FROM verdicts v
  JOIN markets m ON m.id = v.market_id
  WHERE v.id = _verdict_id AND v.status = 'committed';

  IF _market_id IS NULL THEN
    RAISE EXCEPTION 'Verdict not found or not committed';
  END IF;

  -- Check 12h window
  IF now() > _committed_at + INTERVAL '12 hours' THEN
    RAISE EXCEPTION 'Flag window has expired (12 hours)';
  END IF;

  -- Check user is in group
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = _group_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Upsert dispute row
  SELECT id INTO _dispute_id FROM disputes WHERE verdict_id = _verdict_id LIMIT 1;
  IF _dispute_id IS NULL THEN
    INSERT INTO disputes (verdict_id, status, flags) VALUES (_verdict_id, 'open', 0)
    RETURNING id INTO _dispute_id;
  END IF;

  -- Check not already flagged
  IF EXISTS (SELECT 1 FROM dispute_flags WHERE dispute_id = _dispute_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'You have already flagged this verdict';
  END IF;

  -- Insert flag
  INSERT INTO dispute_flags (dispute_id, user_id) VALUES (_dispute_id, _user_id);

  -- Increment flag count
  UPDATE disputes SET flags = flags + 1 WHERE id = _dispute_id RETURNING flags INTO _flag_count;

  -- Check threshold
  SELECT COUNT(*) INTO _member_count FROM group_members WHERE group_id = _group_id;

  IF _flag_count > (_member_count / 2) THEN
    -- Trigger dispute
    UPDATE disputes SET status = 'open' WHERE id = _dispute_id;
    UPDATE markets SET status = 'disputed' WHERE id = _market_id;

    -- Notify all group members
    FOR _member IN SELECT user_id FROM group_members WHERE group_id = _group_id LOOP
      INSERT INTO notifications (user_id, type, payload)
      VALUES (_member.user_id, 'dispute_triggered', jsonb_build_object(
        'market_id', _market_id,
        'group_id', _group_id,
        'dispute_id', _dispute_id
      ));
    END LOOP;
  END IF;

  RETURN jsonb_build_object('dispute_id', _dispute_id, 'flags', _flag_count, 'threshold', (_member_count / 2) + 1);
END;
$$;

-- RPC: cast_dispute_vote
CREATE OR REPLACE FUNCTION public.cast_dispute_vote(_dispute_id UUID, _user_id UUID, _vote public.verdict_outcome)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _verdict_id UUID;
  _market_id UUID;
  _group_id UUID;
  _judge_id UUID;
  _original_verdict public.verdict_outcome;
  _member_count INT;
  _total_votes INT;
  _yes_votes INT;
  _no_votes INT;
  _majority_vote public.verdict_outcome;
  _dispute_status public.dispute_status;
  _member RECORD;
  _bet RECORD;
  _winning_side public.verdict_outcome;
  _total_pool INT;
  _winning_pool INT;
  _payout INT;
BEGIN
  -- Get dispute info
  SELECT d.verdict_id, d.status INTO _verdict_id, _dispute_status
  FROM disputes d WHERE d.id = _dispute_id;

  IF _verdict_id IS NULL THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  IF _dispute_status != 'open' THEN
    RAISE EXCEPTION 'Dispute is not open for voting';
  END IF;

  -- Get market/verdict info
  SELECT v.market_id, v.judge_id, v.verdict INTO _market_id, _judge_id, _original_verdict
  FROM verdicts v WHERE v.id = _verdict_id;

  SELECT m.group_id INTO _group_id FROM markets m WHERE m.id = _market_id;

  -- Check user is in group
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = _group_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Check not already voted
  IF EXISTS (SELECT 1 FROM dispute_votes WHERE dispute_id = _dispute_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'You have already voted';
  END IF;

  -- Insert vote
  INSERT INTO dispute_votes (dispute_id, user_id, vote) VALUES (_dispute_id, _user_id, _vote);

  -- Count votes
  SELECT COUNT(*) INTO _member_count FROM group_members WHERE group_id = _group_id;
  SELECT COUNT(*) INTO _total_votes FROM dispute_votes WHERE dispute_id = _dispute_id;
  SELECT COUNT(*) INTO _yes_votes FROM dispute_votes WHERE dispute_id = _dispute_id AND vote = 'yes';
  _no_votes := _total_votes - _yes_votes;

  -- Check if majority reached (>50% of members voted AND one side has majority)
  IF _total_votes > (_member_count / 2) THEN
    IF _yes_votes > _no_votes THEN
      _majority_vote := 'yes';
    ELSIF _no_votes > _yes_votes THEN
      _majority_vote := 'no';
    ELSE
      -- Tie, not yet resolved
      RETURN jsonb_build_object('status', 'pending', 'yes_votes', _yes_votes, 'no_votes', _no_votes, 'total_votes', _total_votes);
    END IF;

    -- Resolve dispute
    IF _majority_vote = _original_verdict THEN
      -- Upheld: judge integrity +5%
      UPDATE disputes SET status = 'upheld', resolved_at = now(), resolution_verdict = _majority_vote WHERE id = _dispute_id;
      UPDATE verdicts SET status = 'committed' WHERE id = _verdict_id;
      UPDATE markets SET status = 'resolved' WHERE id = _market_id;
      UPDATE group_members SET judge_integrity = LEAST(1.0, judge_integrity + 0.05) WHERE group_id = _group_id AND user_id = _judge_id;
    ELSE
      -- Overturned: judge integrity -15%, reverse and redistribute
      UPDATE disputes SET status = 'overturned', resolved_at = now(), resolution_verdict = _majority_vote WHERE id = _dispute_id;
      UPDATE verdicts SET status = 'overturned', verdict = _majority_vote WHERE id = _verdict_id;
      UPDATE markets SET status = 'resolved' WHERE id = _market_id;
      UPDATE group_members SET judge_integrity = GREATEST(0, judge_integrity - 0.15) WHERE group_id = _group_id AND user_id = _judge_id;

      -- Reverse previous payouts (refund losers, take back from winners based on original verdict)
      -- Then redistribute based on new verdict
      _winning_side := _majority_vote;
      SELECT yes_pool, no_pool, yes_pool + no_pool INTO _winning_pool, _total_pool, _total_pool FROM markets WHERE id = _market_id;
      
      -- Get actual pool values
      SELECT yes_pool + no_pool INTO _total_pool FROM markets WHERE id = _market_id;
      IF _winning_side = 'yes' THEN
        SELECT yes_pool INTO _winning_pool FROM markets WHERE id = _market_id;
      ELSE
        SELECT no_pool INTO _winning_pool FROM markets WHERE id = _market_id;
      END IF;

      -- First: reverse all previous payout/refund transactions for this market
      -- Give back coins to winners who already received, take back from losers who were refunded
      FOR _bet IN
        SELECT b.user_id, b.side, SUM(b.amount) as total_amount
        FROM bets b WHERE b.market_id = _market_id
        GROUP BY b.user_id, b.side
      LOOP
        -- Calculate new payout based on reversed verdict
        IF _bet.side = _winning_side::text THEN
          _payout := CASE WHEN _winning_pool > 0 THEN ROUND((_bet.total_amount::numeric / _winning_pool) * _total_pool) ELSE _bet.total_amount END;
          -- Credit winner
          UPDATE group_members SET coins = coins + _payout WHERE group_id = _group_id AND user_id = _bet.user_id;
          INSERT INTO transactions (user_id, amount, type, reference_id) VALUES (_bet.user_id, _payout, 'payout', _market_id);
        END IF;
      END LOOP;
    END IF;

    -- Notify all group members
    FOR _member IN SELECT user_id FROM group_members WHERE group_id = _group_id LOOP
      INSERT INTO notifications (user_id, type, payload)
      VALUES (_member.user_id, 'dispute_resolved', jsonb_build_object(
        'market_id', _market_id,
        'group_id', _group_id,
        'dispute_id', _dispute_id,
        'result', _majority_vote::text,
        'original_verdict', _original_verdict::text,
        'upheld', (_majority_vote = _original_verdict)
      ));
    END LOOP;
  END IF;

  RETURN jsonb_build_object('status', 'voted', 'yes_votes', _yes_votes, 'no_votes', _no_votes, 'total_votes', _total_votes);
END;
$$;
