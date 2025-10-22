-- RLS Policies for password_credentials (system-only access, no direct user access)
CREATE POLICY "Password credentials are managed by system only"
  ON public.password_credentials FOR ALL
  USING (false);

-- RLS Policies for oauth_accounts
CREATE POLICY "Users can view their own oauth accounts"
  ON public.oauth_accounts FOR SELECT
  USING (customer_id = (current_setting('app.current_customer_id', true))::uuid);