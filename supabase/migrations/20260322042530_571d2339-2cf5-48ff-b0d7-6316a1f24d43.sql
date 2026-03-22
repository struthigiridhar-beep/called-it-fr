
SELECT cron.schedule(
  'assign-judge-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://razysbftitloqrjbstal.supabase.co/functions/v1/assign-judge',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhenlzYmZ0aXRsb3FyamJzdGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDA1NDgsImV4cCI6MjA4OTU3NjU0OH0.ex5s-enN2gbFdASyDOy4rOQBwfyYKwX5XSvL3Bvv6HE"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
