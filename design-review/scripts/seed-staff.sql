-- Dati aggiuntivi per la cattura della sezione Staff. SOLO sul DB del worktree (stampy_wt_dr4), mai su stampy_dev.
-- Idempotente. Da lanciare dopo seed-capture.sql.
BEGIN;

-- 1) Una promozione «vecchia» di Rossi (terminata quando è iniziata quella attuale): serve a far risultare
--    promotionChanged=true (card ancora sulla vecchia promozione) con il calcolo VERO del backend.
INSERT INTO promotions (venue_id, type, name, config, starts_at, ends_at)
SELECT venue_id, type, '10 timbri: Cappuccino gratis (vecchia)', '{"v": 1, "reward": "Cappuccino gratis", "stampsRequired": 10}'::jsonb,
       timestamptz '2026-01-01 00:00+00', starts_at
FROM promotions
WHERE venue_id = 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f' AND ends_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM promotions p2 WHERE p2.venue_id = 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f' AND p2.name LIKE '%(vecchia)');

-- 2) Più card da Rossi (per la «lista lunga» della coda): arriva a 14 card con clienti @stampy.test non membri.
INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
SELECT u.id, 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f',
       (SELECT id FROM promotions WHERE venue_id = 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f' AND ends_at IS NULL),
       (abs(hashtext(u.email)) % 9),
       upper(substr(md5(u.email || 'dr4'), 1, 8)), 'google',
       '3388000000023210630.' || gen_random_uuid()::text, 'not_added'
FROM users u
WHERE u.email LIKE '%@stampy.test' AND u.display_name IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM venue_members m WHERE m.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.user_id = u.id AND c.venue_id = 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f')
ORDER BY u.email
LIMIT 8;

COMMIT;
