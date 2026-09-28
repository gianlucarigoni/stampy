import { env } from "./config/env.js";
import { loadServiceAccount } from "./config/serviceAccount.js";
import { GoogleWalletProvider } from "./modules/wallet/google/GoogleWalletProvider.js";
import { createApp } from "./app.js";

const serviceAccount = loadServiceAccount(env.WALLET_SERVICE_ACCOUNT_KEY_PATH, env.WALLET_SERVICE_ACCOUNT_EMAIL);

const walletProvider = new GoogleWalletProvider({
  issuerId: env.WALLET_ISSUER_ID,
  serviceAccountEmail: serviceAccount.clientEmail,
  privateKey: serviceAccount.privateKey,
  logoUrl: env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL}/static/logo.png` : "",
});

const app = createApp({
  nodeEnv: env.NODE_ENV,
  devSecret: env.DEV_ENDPOINT_SECRET,
  publicBaseUrl: env.PUBLIC_BASE_URL,
  walletProvider,
});

app.listen(env.PORT, () => {
  console.log(`Stampy backend in ascolto su http://localhost:${env.PORT} (${env.NODE_ENV})`);
  if (!env.PUBLIC_BASE_URL) {
    console.warn("PUBLIC_BASE_URL vuoto: la route di prova risponderà 503 finché non lo imposti");
  }
});
