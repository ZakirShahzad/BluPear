-- Update the handle_new_user function to also create a trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  
  -- Insert into subscribers table with Trial Tier
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_cancelled)
  VALUES (NEW.id, NEW.email, false, 'Trial Tier', false);
  
  RETURN NEW;
END;
$$;