
-- 1. INSERT RLS policy on events for triggers (SECURITY DEFINER functions bypass RLS, but add policy anyway for future client inserts)
CREATE POLICY "Authenticated users can insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Trigger: bets → bet_placed event
CREATE OR REPLACE FUNCTION public.handle_new_bet_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO events (group_id, user_id, event_type, payload)
  VALUES (
    (SELECT group_id FROM markets WHERE id = NEW.market_id),
    NEW.user_id,
    'bet_placed',
    jsonb_build_object(
      'market_id', NEW.market_id,
      'side', NEW.side,
      'amount', NEW.amount,
      'question', (SELECT question FROM markets WHERE id = NEW.market_id)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bet_event
  AFTER INSERT ON bets FOR EACH ROW
  EXECUTE FUNCTION handle_new_bet_event();

-- 3. Trigger: markets → market_created event
CREATE OR REPLACE FUNCTION public.handle_new_market_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.group_id IS NOT NULL AND NEW.created_by IS NOT NULL THEN
    INSERT INTO events (group_id, user_id, event_type, payload)
    VALUES (
      NEW.group_id,
      NEW.created_by,
      'market_created',
      jsonb_build_object('market_id', NEW.id, 'question', NEW.question, 'deadline', NEW.deadline)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_market_event
  AFTER INSERT ON markets FOR EACH ROW
  EXECUTE FUNCTION handle_new_market_event();

-- 4. Trigger: verdicts (committed) → verdict_in event
CREATE OR REPLACE FUNCTION public.handle_new_verdict_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'committed' THEN
    INSERT INTO events (group_id, user_id, event_type, payload)
    VALUES (
      (SELECT group_id FROM markets WHERE id = NEW.market_id),
      NEW.judge_id,
      'market_settled',
      jsonb_build_object(
        'market_id', NEW.market_id,
        'verdict', NEW.verdict,
        'question', (SELECT question FROM markets WHERE id = NEW.market_id)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verdict_event
  AFTER INSERT ON verdicts FOR EACH ROW
  EXECUTE FUNCTION handle_new_verdict_event();

-- 5. Trigger: roasts → roast_sent event
CREATE OR REPLACE FUNCTION public.handle_new_roast_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO events (group_id, user_id, event_type, payload)
  VALUES (
    NEW.group_id,
    NEW.from_user,
    'roast_sent',
    jsonb_build_object('to_user_id', NEW.to_user, 'message', NEW.message)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roast_event
  AFTER INSERT ON roasts FOR EACH ROW
  EXECUTE FUNCTION handle_new_roast_event();

-- 6. Backfill existing bets
INSERT INTO events (group_id, user_id, event_type, payload, created_at)
SELECT m.group_id, b.user_id, 'bet_placed',
  jsonb_build_object('market_id', b.market_id, 'side', b.side, 'amount', b.amount, 'question', m.question),
  b.created_at
FROM bets b JOIN markets m ON m.id = b.market_id
WHERE m.group_id IS NOT NULL;

-- 7. Backfill existing markets
INSERT INTO events (group_id, user_id, event_type, payload, created_at)
SELECT group_id, created_by, 'market_created',
  jsonb_build_object('market_id', id, 'question', question, 'deadline', deadline),
  created_at
FROM markets WHERE group_id IS NOT NULL AND created_by IS NOT NULL;

-- 8. Backfill existing committed verdicts
INSERT INTO events (group_id, user_id, event_type, payload, created_at)
SELECT m.group_id, v.judge_id, 'market_settled',
  jsonb_build_object('market_id', v.market_id, 'verdict', v.verdict, 'question', m.question),
  v.committed_at
FROM verdicts v JOIN markets m ON m.id = v.market_id
WHERE v.status = 'committed' AND m.group_id IS NOT NULL;

-- 9. Backfill existing roasts
INSERT INTO events (group_id, user_id, event_type, payload, created_at)
SELECT group_id, from_user, 'roast_sent',
  jsonb_build_object('to_user_id', to_user, 'message', message),
  created_at
FROM roasts;
