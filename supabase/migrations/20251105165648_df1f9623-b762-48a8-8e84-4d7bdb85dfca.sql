-- Add stripe_subscription_id column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN stripe_subscription_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for direct API lookups';