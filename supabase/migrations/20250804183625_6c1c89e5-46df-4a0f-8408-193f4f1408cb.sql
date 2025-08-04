-- Add subscription_cancelled column to track cancellation status
ALTER TABLE public.subscribers 
ADD COLUMN subscription_cancelled BOOLEAN NOT NULL DEFAULT false;