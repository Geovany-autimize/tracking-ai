-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to sync couriers every Sunday at 3 AM
SELECT cron.schedule(
  'sync-couriers-weekly',
  '0 3 * * 0', -- Every Sunday at 3 AM (minute hour day month day_of_week)
  $$
  SELECT
    net.http_post(
        url:='https://pvnwcxfnazwqpfasuztv.supabase.co/functions/v1/sync-couriers',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bndjeGZuYXp3cXBmYXN1enR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzE4OTcsImV4cCI6MjA3Njc0Nzg5N30.GnojnE5NgRBH9kvE9Ddkj7gel3YbyXvDtnYxUruFxaM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
