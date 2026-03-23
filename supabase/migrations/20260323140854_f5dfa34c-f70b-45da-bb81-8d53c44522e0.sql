-- One-time fix: resolve markets that have committed verdicts but are still closed
UPDATE markets SET status = 'resolved'
WHERE status = 'closed'
  AND id IN (SELECT market_id FROM verdicts WHERE status = 'committed');