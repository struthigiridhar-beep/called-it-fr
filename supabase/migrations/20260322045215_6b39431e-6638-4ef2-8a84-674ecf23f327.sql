-- First reopen the market we just created so we can re-test with different created_by
UPDATE markets SET created_by = NULL WHERE id = '0bc18bef-34bf-4e96-bc49-821667a6f581';
-- Also reset status back to open since assign-judge closed it
UPDATE markets SET status = 'open' WHERE id = '0bc18bef-34bf-4e96-bc49-821667a6f581';