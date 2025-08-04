-- Create scan_usage table to track monthly scan counts
CREATE TABLE public.scan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own scan usage" 
ON public.scan_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan usage" 
ON public.scan_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan usage" 
ON public.scan_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage scan usage" 
ON public.scan_usage 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_scan_usage_updated_at
BEFORE UPDATE ON public.scan_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment scan count
CREATE OR REPLACE FUNCTION public.increment_scan_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    current_month TEXT := to_char(now(), 'YYYY-MM');
    new_count INTEGER;
BEGIN
    -- Insert or update scan count for current month
    INSERT INTO public.scan_usage (user_id, month_year, scan_count)
    VALUES (p_user_id, current_month, 1)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET 
        scan_count = scan_usage.scan_count + 1,
        updated_at = now()
    RETURNING scan_count INTO new_count;
    
    RETURN new_count;
END;
$$;

-- Function to get current month scan count
CREATE OR REPLACE FUNCTION public.get_current_scan_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    current_month TEXT := to_char(now(), 'YYYY-MM');
    count_result INTEGER := 0;
BEGIN
    SELECT COALESCE(scan_count, 0) INTO count_result
    FROM public.scan_usage
    WHERE user_id = p_user_id AND month_year = current_month;
    
    RETURN count_result;
END;
$$;