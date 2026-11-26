-- Stati mancanti per la cattura. Da lanciare SOLO sul DB del worktree (stampy_wt_dr), mai su stampy_dev.
-- Idempotente: rilanciarlo non duplica nulla (le richieste in attesa vengono rinnovate).
BEGIN;

-- 1) Utente senza nome (per /name): email di test, identità email.
INSERT INTO users (email, display_name)
VALUES ('senza.nome@stampy.test', NULL)
ON CONFLICT (email) DO NOTHING;
INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider)
SELECT id, 'email', email, email FROM users WHERE email = 'senza.nome@stampy.test'
ON CONFLICT DO NOTHING;

-- 2) Card piena: lorenzo.fontana da Da Gennaro (soglia 8): 7 -> 8.
UPDATE cards SET stamps_count = 8
WHERE user_id = (SELECT id FROM users WHERE email = 'lorenzo.fontana@stampy.test')
  AND venue_id = 'fcabed57-e2a6-4ab4-bf2e-b24f689caa30';

-- 3) Richieste in attesa (scadenza lunga, 7 giorni, per non scadere durante le catture):
--    lorenzo.fontana @ Fiordilatte (7/10), sofia.conti @ Rossi (1/10), matteo.ricci @ Rossi (7/10).
DELETE FROM stamp_requests WHERE status = 'pending';
INSERT INTO stamp_requests (card_id, venue_id, status, expires_at)
SELECT c.id, c.venue_id, 'pending', now() + interval '7 days'
FROM cards c JOIN users u ON u.id = c.user_id
WHERE (u.email, c.venue_id) IN (
  ('lorenzo.fontana@stampy.test', 'a59ab86c-98e1-4525-8e47-f61de171e55e'),
  ('sofia.conti@stampy.test',     'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f'),
  ('matteo.ricci@stampy.test',    'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f'));
COMMIT;
