INSERT INTO invites (group_id, created_by, code)
VALUES ('edc82a78-ed6a-496f-8f72-3640c8f0f437', '2d7104eb-27e6-42b0-946d-cd9d6b165786', 'test123')
ON CONFLICT DO NOTHING;