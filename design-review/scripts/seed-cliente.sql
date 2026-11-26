-- Dati aggiuntivi per la cattura della sezione Cliente. SOLO sul DB del worktree (stampy_wt_dr3), mai su stampy_dev.
-- Idempotente.
BEGIN;
INSERT INTO users (email, display_name) VALUES
  ('vuoto.storico@stampy.test', 'Paola Vuoto'),
  ('nome.molto.lungo.per.provare.il.layout.del.profilo@stampy.test', left('Bartolomeomassimilianoalessandrogiovanniferdinando', 50))
ON CONFLICT (email) DO NOTHING;
INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider)
SELECT id, 'email', email, email FROM users
WHERE email IN ('vuoto.storico@stampy.test', 'nome.molto.lungo.per.provare.il.layout.del.profilo@stampy.test')
ON CONFLICT DO NOTHING;
COMMIT;
