-- Fix function search path security warnings by setting explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.edge_function_rate_limits 
  WHERE window_start < now() - interval '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_scan_cache()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.scan_cache 
  WHERE created_at < now() - interval '30 days';
END;
$$;