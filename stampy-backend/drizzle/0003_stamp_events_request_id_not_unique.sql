ALTER TABLE "stamp_events" DROP CONSTRAINT "stamp_events_request_id_unique";--> statement-breakpoint
CREATE INDEX "stamp_events_request_idx" ON "stamp_events" USING btree ("request_id");