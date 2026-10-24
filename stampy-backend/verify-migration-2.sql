BEGIN;
DO $$
DECLARE
  u1 uuid; u2 uuid; u3 uuid;
BEGIN
  INSERT INTO users (email) VALUES ('a@test.it') RETURNING id INTO u1;
  INSERT INTO users (email) VALUES ('b@test.it') RETURNING id INTO u2;
  INSERT INTO users (email) VALUES (NULL)        RETURNING id INTO u3;

  -- users
  BEGIN
    INSERT INTO users (email) VALUES ('a@test.it');
    RAISE NOTICE 'FAIL 01 email duplicata accettata';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   01 email duplicata rifiutata';
  END;

  BEGIN
    INSERT INTO users (email) VALUES (NULL), (NULL);
    RAISE NOTICE 'OK   02 piu utenti senza email accettati';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 02 utenti senza email rifiutati: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO users (email) VALUES ('Mario@Test.it');
    RAISE NOTICE 'FAIL 03 email con maiuscole accettata';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   03 email con maiuscole rifiutata';
  END;

  BEGIN
    INSERT INTO users (email) VALUES (' c@test.it');
    RAISE NOTICE 'FAIL 04 email con spazi accettata';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   04 email con spazi rifiutata';
  END;

  -- auth_identities
  INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider)
  VALUES (u1, 'email', 'a@test.it', 'a@test.it');

  BEGIN
    INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES (u2, 'email', 'a@test.it');
    RAISE NOTICE 'FAIL 05 identita (provider, id) duplicata accettata';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   05 identita (provider, id) duplicata rifiutata';
  END;

  BEGIN
    INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES (u1, 'email', 'altra@test.it');
    RAISE NOTICE 'FAIL 06 seconda identita email per lo stesso utente accettata';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   06 seconda identita email per lo stesso utente rifiutata';
  END;

  BEGIN
    INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES (u2, 'email', 'B@test.it');
    RAISE NOTICE 'FAIL 07 identita email con maiuscole accettata';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   07 identita email con maiuscole rifiutata';
  END;

  BEGIN
    INSERT INTO auth_identities (user_id, provider, provider_user_id) VALUES (u2, 'google', 'AbC123');
    RAISE NOTICE 'OK   08 sub Google con maiuscole accettato';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 08 sub Google rifiutato: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO auth_identities (user_id, provider, provider_user_id, email_at_provider)
    VALUES (u3, 'google', 'sub999', 'X@Test.it');
    RAISE NOTICE 'FAIL 09 email_at_provider con maiuscole accettata';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   09 email_at_provider con maiuscole rifiutata';
  END;

  -- otp_challenges
  INSERT INTO otp_challenges (channel, destination, code_hash, expires_at)
  VALUES ('email', 'x@test.it', 'h1', now() + interval '5 minutes');

  BEGIN
    INSERT INTO otp_challenges (channel, destination, code_hash, expires_at)
    VALUES ('email', 'x@test.it', 'h2', now() + interval '5 minutes');
    RAISE NOTICE 'FAIL 10 seconda sfida attiva accettata';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   10 seconda sfida attiva rifiutata';
  END;

  UPDATE otp_challenges SET invalidated_at = now() WHERE destination = 'x@test.it';
  BEGIN
    INSERT INTO otp_challenges (channel, destination, code_hash, expires_at)
    VALUES ('email', 'x@test.it', 'h3', now() + interval '5 minutes');
    RAISE NOTICE 'OK   11 nuova sfida accettata dopo invalidazione';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 11 nuova sfida rifiutata dopo invalidazione: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO otp_challenges (channel, destination, code_hash, attempts, expires_at)
    VALUES ('email', 'y@test.it', 'h4', -1, now() + interval '5 minutes');
    RAISE NOTICE 'FAIL 12 attempts negativo accettato';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   12 attempts negativo rifiutato';
  END;

  BEGIN
    INSERT INTO otp_challenges (channel, destination, code_hash, expires_at)
    VALUES ('email', 'Y@test.it', 'h5', now() + interval '5 minutes');
    RAISE NOTICE 'FAIL 13 destinatario con maiuscole accettato';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK   13 destinatario con maiuscole rifiutato';
  END;

  -- sessions
  INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at)
  VALUES (u1, 'hash1', 'email', now() + interval '1 day');

  BEGIN
    INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at)
    VALUES (u2, 'hash1', 'email', now() + interval '1 day');
    RAISE NOTICE 'FAIL 14 token_hash duplicato accettato';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK   14 token_hash duplicato rifiutato';
  END;

  -- FK RESTRICT
  BEGIN
    DELETE FROM users WHERE id = u1;
    RAISE NOTICE 'FAIL 15 cancellazione utente con identita accettata';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK   15 cancellazione utente con identita rifiutata';
  END;

  -- auth_events
  BEGIN
    INSERT INTO auth_events (user_id, type) VALUES (NULL, 'otp_failed');
    RAISE NOTICE 'OK   16 evento con utente sconosciuto accettato';
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL 16 evento con utente NULL rifiutato: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO auth_events (user_id, type) VALUES (gen_random_uuid(), 'otp_failed');
    RAISE NOTICE 'FAIL 17 evento con utente inesistente accettato';
  EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'OK   17 evento con utente inesistente rifiutato';
  END;

  -- regressioni sulla migration 1 e sul telefono
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotions_no_overlap')
    THEN RAISE NOTICE 'OK   18 promotions_no_overlap ancora presente';
    ELSE RAISE NOTICE 'FAIL 18 promotions_no_overlap sparito';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name LIKE 'phone%')
    THEN RAISE NOTICE 'OK   19 colonne phone_* rimosse';
    ELSE RAISE NOTICE 'FAIL 19 colonne phone_* ancora presenti';
  END IF;
END $$;
ROLLBACK;
