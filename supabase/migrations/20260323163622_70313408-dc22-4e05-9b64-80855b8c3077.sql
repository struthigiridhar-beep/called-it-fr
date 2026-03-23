-- Delete the duplicate uppercase PENDING verdict row
DELETE FROM verdicts WHERE id = 'a67334f2-94eb-4cbe-b2a4-72e1cfc14857';

-- Normalize all verdict statuses to lowercase
UPDATE verdicts SET status = lower(status) WHERE status != lower(status);

-- Add CHECK constraint to prevent future casing issues
ALTER TABLE verdicts ADD CONSTRAINT verdicts_status_check
  CHECK (status IN ('pending', 'committed', 'overturned'));

-- Add UNIQUE constraint to prevent duplicate judge assignments per market
ALTER TABLE verdicts ADD CONSTRAINT verdicts_market_id_unique UNIQUE (market_id);

-- Backfill: resolve any closed markets with committed verdicts
UPDATE markets SET status = 'resolved'
WHERE status = 'closed'
  AND id IN (SELECT market_id FROM verdicts WHERE status = 'committed')