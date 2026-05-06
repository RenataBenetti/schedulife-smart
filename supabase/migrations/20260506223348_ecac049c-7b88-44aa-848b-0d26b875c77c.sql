DO $$
DECLARE
  fn_url text := 'https://qqkiecshltiqdvfrhgcw.supabase.co/functions/v1/payment-pending-check';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa2llY3NobHRpcWR2ZnJoZ2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzg5MTIsImV4cCI6MjA4Njg1NDkxMn0.7qyZccGUzrh_BL8xr3DjC87XpVm5XidAbVL5UqgZur4';
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'payment-pending-daily') THEN
    PERFORM cron.unschedule('payment-pending-daily');
  END IF;

  PERFORM cron.schedule(
    'payment-pending-daily',
    '0 12 * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cron$, fn_url, anon_key)
  );
END $$;