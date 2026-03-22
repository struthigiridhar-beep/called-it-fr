
-- Add status column to verdicts table
ALTER TABLE public.verdicts ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Allow judge to update their own verdict
CREATE POLICY "Judge can update verdict" ON public.verdicts
  FOR UPDATE TO authenticated USING (auth.uid() = judge_id);
