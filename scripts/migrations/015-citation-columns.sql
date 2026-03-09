-- Add citation tracking columns to datapoints table.
-- These enable every D1 value to link back to the specific passage
-- in the source document that produced it.
--
-- The latest_datapoints VIEW uses SELECT * so it picks up new columns automatically.

ALTER TABLE datapoints ADD COLUMN citation_quote TEXT;
ALTER TABLE datapoints ADD COLUMN citation_search_term TEXT;
ALTER TABLE datapoints ADD COLUMN xbrl_concept TEXT;
