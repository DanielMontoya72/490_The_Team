-- Document the existing password_reset_tokens table
-- This is a documentation-only migration - table already exists
-- RLS is intentionally enabled with NO policies
-- This table is only accessed via edge functions using service role key

-- Create table only if it doesn't exist (should already exist)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled with NO policies is intentional - security by design
-- Only service role (edge functions) can access this table
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Add index for token lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
  ON public.password_reset_tokens(token);

-- Add index for user lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
  ON public.password_reset_tokens(user_id);

COMMENT ON TABLE public.password_reset_tokens IS 'Stores password reset tokens. RLS enabled with NO policies intentionally - accessed only via edge functions using service role key.';