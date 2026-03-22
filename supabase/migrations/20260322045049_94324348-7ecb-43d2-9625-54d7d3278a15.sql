INSERT INTO markets (question, deadline, group_id, created_by, status, category, min_bet, yes_pool, no_pool)
VALUES (
  'Will it rain tomorrow?',
  now() - interval '1 hour',
  'edc82a78-ed6a-496f-8f72-3640c8f0f437',
  '2d7104eb-27e6-42b0-946d-cd9d6b165786',
  'open',
  'weather',
  10,
  50,
  30
);