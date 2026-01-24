-- Migration: Add mnav to discrepancy_field enum
-- Date: 2026-01-24
-- Purpose: Support mNAV comparison in discrepancy detection

-- Add 'mnav' to the discrepancy_field enum
-- This allows tracking mNAV discrepancies between our calculated values and official dashboards
DO $$ BEGIN
  ALTER TYPE discrepancy_field ADD VALUE IF NOT EXISTS 'mnav';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
