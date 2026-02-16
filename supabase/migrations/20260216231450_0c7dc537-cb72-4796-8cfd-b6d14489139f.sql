ALTER TABLE public.message_templates
ADD COLUMN message_type text NOT NULL DEFAULT 'text'
CHECK (message_type IN ('text', 'payment_link'));