CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE promotions
  ADD CONSTRAINT promotions_no_overlap
  EXCLUDE USING gist (venue_id WITH =, tstzrange(starts_at, ends_at) WITH &&);
