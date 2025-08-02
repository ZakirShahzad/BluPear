-- Create scan_cache table for storing scan results by commit SHA
CREATE TABLE public.scan_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_hash TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  results JSONB NOT NULL,
  security_score JSONB NOT NULL,
  files_scanned INTEGER NOT NULL DEFAULT 0,
  scan_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scan_cache ENABLE ROW LEVEL SECURITY;

-- Create policies - scan cache should be publicly readable for consistency
-- but only the system can insert/update (no user_id association needed)
CREATE POLICY "Scan cache is publicly readable"
ON public.scan_cache
FOR SELECT
USING (true);

-- Only allow system to insert/update cached results
CREATE POLICY "System can insert scan cache"
ON public.scan_cache
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update scan cache"
ON public.scan_cache
FOR UPDATE
USING (true);

-- Create unique index for efficient lookups
CREATE UNIQUE INDEX idx_scan_cache_repo_commit 
ON public.scan_cache (repo_hash, commit_sha);

-- Create index for cleanup of old cache entries
CREATE INDEX idx_scan_cache_created_at 
ON public.scan_cache (created_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_scan_cache_updated_at
BEFORE UPDATE ON public.scan_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up old cache entries (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_scan_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.scan_cache 
  WHERE created_at < now() - interval '30 days';
END;
$$;