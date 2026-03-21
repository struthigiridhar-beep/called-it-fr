-- Create a seed public group and featured market for the landing page
DO $$
DECLARE
  seed_user_id uuid := '2d7104eb-27e6-42b0-946d-cd9d6b165786';
  seed_group_id uuid := gen_random_uuid();
BEGIN
  -- Create a public group
  INSERT INTO public.groups (id, name, is_public, created_by)
  VALUES (seed_group_id, 'Called It HQ', true, seed_user_id);

  -- Add the creator as a member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (seed_group_id, seed_user_id);

  -- Create a pinned public market
  INSERT INTO public.markets (question, category, is_public, is_pinned, status, yes_pool, no_pool, deadline, created_by, group_id)
  VALUES (
    'Will the group ship before demo day?',
    'work',
    true,
    true,
    'open',
    150,
    75,
    now() + interval '7 days',
    seed_user_id,
    seed_group_id
  );
END $$;