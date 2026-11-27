# Test e2e del frontend

Riferimento da leggere quando tocchi il frontend o lanci gli e2e.

## Come si lanciano

Da `stampy-frontend/`, con `E2E_APP_URL` impostato alla porta del **tuo** frontend (la leggi da `stampy-frontend/.env.local`):

```bash
E2E_APP_URL=http://localhost:<porta frontend> npm run e2e
```

## Database e fixture

- Le fixture usano il DB di `DATABASE_URL` in `stampy-backend/.env` del worktree (o `E2E_DB`).
- Rifiutano `stampy_dev`, salvo `E2E_ALLOW_MAIN_DB=1`, che **un agente non imposta**.
- Se il DB è vuoto creano un locale con branding di ripiego: su un worktree appena creato gli e2e partono senza altro.

## Cosa riportare

- Uno script e2e che fallisce, o che non puoi eseguire, va **dichiarato nel report**: non darlo per verde.
- Il tema scuro e la resa a schermo non si verificano da terminale: annotali nel report come "non verificato a vista".
