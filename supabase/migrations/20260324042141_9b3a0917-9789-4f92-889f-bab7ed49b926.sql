
-- Rewrite resolve_market to include payout logic
CREATE OR REPLACE FUNCTION public.resolve_market(_market_id uuid, _judge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _winning_side public.verdict_outcome;
  _group_id UUID;
  _total_pool INT;
  _winning_pool INT;
  _payout INT;
  _bet RECORD;
BEGIN
  -- Verify committed verdict exists
  SELECT v.verdict, m.group_id, m.yes_pool + m.no_pool
  INTO _winning_side, _group_id, _total_pool
  FROM verdicts v
  JOIN markets m ON m.id = v.market_id
  WHERE v.market_id = _market_id
    AND v.judge_id = _judge_id
    AND v.status = 'committed';

  IF _winning_side IS NULL THEN
    RAISE EXCEPTION 'No committed verdict found for this judge and market';
  END IF;

  -- Get winning pool
  IF _winning_side = 'yes' THEN
    SELECT yes_pool INTO _winning_pool FROM markets WHERE id = _market_id;
  ELSE
    SELECT no_pool INTO _winning_pool FROM markets WHERE id = _market_id;
  END IF;

  -- Distribute payouts to winners
  IF _winning_pool > 0 AND _total_pool > 0 THEN
    FOR _bet IN
      SELECT user_id, SUM(amount) as total_amount
      FROM bets
      WHERE market_id = _market_id AND side = _winning_side::text::bet_side
      GROUP BY user_id
    LOOP
      _payout := ROUND((_bet.total_amount::numeric / _winning_pool) * _total_pool);

      -- Credit coins
      UPDATE group_members
      SET coins = coins + _payout, xp = xp + 10
      WHERE group_id = _group_id AND user_id = _bet.user_id;

      -- Record transaction
      INSERT INTO transactions (user_id, amount, type, reference_id)
      VALUES (_bet.user_id, _payout, 'payout', _market_id);
    END LOOP;
  END IF;

  -- Resolve market
  UPDATE markets SET status = 'resolved' WHERE id = _market_id;
END;
$function$;

-- Backfill payouts for already-resolved markets that have no payout transactions
DO $$
DECLARE
  _market RECORD;
  _winning_side public.verdict_outcome;
  _group_id UUID;
  _total_pool INT;
  _winning_pool INT;
  _payout INT;
  _bet RECORD;
BEGIN
  FOR _market IN
    SELECT m.id, m.group_id, m.yes_pool, m.no_pool, m.yes_pool + m.no_pool as total_pool, v.verdict
    FROM markets m
    JOIN verdicts v ON v.market_id = m.id AND v.status = 'committed'
    WHERE m.status = 'resolved'
      AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.reference_id = m.id AND t.type = 'payout')
  LOOP
    _winning_side := _market.verdict;
    _total_pool := _market.total_pool;
    _group_id := _market.group_id;

    IF _winning_side = 'yes' THEN
      _winning_pool := _market.yes_pool;
    ELSE
      _winning_pool := _market.no_pool;
    END IF;

    IF _winning_pool > 0 AND _total_pool > 0 THEN
      FOR _bet IN
        SELECT user_id, SUM(amount) as total_amount
        FROM bets
        WHERE market_id = _market.id AND side = _winning_side::text::bet_side
        GROUP BY user_id
      LOOP
        _payout := ROUND((_bet.total_amount::numeric / _winning_pool) * _total_pool);

        UPDATE group_members
        SET coins = coins + _payout, xp = xp + 10
        WHERE group_id = _group_id AND user_id = _bet.user_id;

        INSERT INTO transactions (user_id, amount, type, reference_id)
        VALUES (_bet.user_id, _payout, 'payout', _market.id);
      END LOOP;
    END IF;
  END LOOP;
END $$;
