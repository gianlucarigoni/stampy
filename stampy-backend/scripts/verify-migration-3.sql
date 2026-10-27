-- Verifica della migration 3 (stamp_events.request_id non più UNIQUE).
-- Tutto in una transazione con ROLLBACK: non sporca il DB.
--   docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
BEGIN;
DO $$
DECLARE
  u uuid; v uuid; p uuid; c uuid; r uuid;
BEGIN
  INSERT INTO users (email) VALUES ('m3@test.it') RETURNING id INTO u;
  INSERT INTO venues (name, slug) VALUES ('M3 Test', 'm3-test') RETURNING id INTO v;
  INSERT INTO promotions (venue_id, type, name, config, starts_at)
    VALUES (v, 'stamps', 'M3', '{"v":1,"stampsRequired":10,"reward":"Premio"}'::jsonb, now() - interval '1 day')
    RETURNING id INTO p;
  INSERT INTO cards (user_id, venue_id, promotion_id, public_code, wallet_provider, wallet_object_id)
    VALUES (u, v, p, 'M3CODE01', 'google', 'issuer.m3') RETURNING id INTO c;
  INSERT INTO stamp_requests (card_id, venue_id, expires_at)
    VALUES (c, v, now() + interval '3 minutes') RETURNING id INTO r;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stamp_events_request_id_unique')
    THEN RAISE NOTICE 'OK   01 UNIQUE su stamp_events.request_id rimosso';
    ELSE RAISE NOTICE 'FAIL 01 UNIQUE su stamp_events.request_id ancora presente';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'stamp_events' AND indexname = 'stamp_events_request_idx')
    THEN RAISE NOTICE 'OK   02 indice stamp_events_request_idx presente';
    ELSE RAISE NOTICE 'FAIL 02 indice stamp_events_request_idx mancante';
  END IF;

  BEGIN
    INSERT INTO stamp_events (card_id, venue_id, promotion_id, operator_id, request_id, type, quantity, idempotency_key)
    VALUES (c, v, p, u, r, 'stamp', 10, r::text || ':1'),
           (c, v, p, u, r, 'redeem', 1, r::text || ':2');
    RAISE NOTICE 'OK   03 piu eventi con lo stesso request_id accettati';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 03 secondo evento rifiutato: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO stamp_events (card_id, venue_id, promotion_id, operator_id, request_id, type, quantity, idempotency_key)
    VALUES (c, v, p, u, r, 'stamp', 1, r::text || ':1');
    RAISE NOTICE 'FAIL 04 idempotency_key duplicata accettata';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   04 idempotency_key duplicata rifiutata';
  END;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stamp_events_request_id_venue_id_stamp_requests_id_venue_id_fk')
    THEN RAISE NOTICE 'OK   05 FK (request_id, venue_id) ancora presente';
    ELSE RAISE NOTICE 'FAIL 05 FK (request_id, venue_id) sparita';
  END IF;

  BEGIN
    INSERT INTO stamp_events (card_id, venue_id, promotion_id, operator_id, request_id, type, quantity, idempotency_key)
    VALUES (c, v, p, u, NULL, 'stamp', 1, 'm3-null-request');
    RAISE NOTICE 'OK   06 evento con request_id NULL accettato';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 06 evento con request_id NULL rifiutato: %', SQLERRM;
  END;
END $$;
ROLLBACK;
