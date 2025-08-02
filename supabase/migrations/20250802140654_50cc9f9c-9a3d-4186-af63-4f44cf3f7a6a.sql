-- Create table for tracking edge function rate limits
CREATE TABLE public.edge_function_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for rate limits
CREATE POLICY "Users can view their own rate limits" 
ON public.edge_function_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" 
ON public.edge_function_rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" 
ON public.edge_function_rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_rate_limits_user_function_window ON public.edge_function_rate_limits(user_id, function_name, window_start);

-- Create function to clean up old rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.edge_function_rate_limits 
  WHERE window_start < now() - interval '24 hours';
END;
$$;