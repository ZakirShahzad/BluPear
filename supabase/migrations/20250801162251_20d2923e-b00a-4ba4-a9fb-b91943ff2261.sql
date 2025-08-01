-- Create scan_reports table
CREATE TABLE public.scan_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  repository_url TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  security_score INTEGER NOT NULL,
  total_issues INTEGER NOT NULL,
  critical_issues INTEGER NOT NULL,
  high_issues INTEGER NOT NULL,
  medium_issues INTEGER NOT NULL,
  low_issues INTEGER NOT NULL,
  scan_results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scan_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scan reports" 
ON public.scan_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan reports" 
ON public.scan_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan reports" 
ON public.scan_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan reports" 
ON public.scan_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scan_reports_updated_at
BEFORE UPDATE ON public.scan_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();