
-- Add OAuth token columns to google_calendar_config
ALTER TABLE public.google_calendar_config
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
