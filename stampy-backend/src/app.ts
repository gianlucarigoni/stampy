import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { WalletProvider } from "./modules/wallet/walletProvider.js";
import { healthRouter } from "./routes/health.js";
import { createDevWalletRouter } from "./routes/devWallet.js";

export interface AppDeps {
  nodeEnv: string;
  devSecret: string;
  publicBaseUrl: string;
  walletProvider: WalletProvider;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable("x-powered-by");

  // Logo del pass: Google lo scarica da questo URL pubblico
  app.use("/static", express.static(path.resolve(here, "../public")));

  app.use(healthRouter);

  // Route di prova: mai in produzione
  if (deps.nodeEnv !== "production") {
    app.use(
      "/dev",
      createDevWalletRouter({
        devSecret: deps.devSecret,
        publicBaseUrl: deps.publicBaseUrl,
        walletProvider: deps.walletProvider,
      }),
    );
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[errore]", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "internal_error" });
  };
  app.use(errorHandler);

  return app;
}
